/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isUndefined } from 'lodash';
import { set } from '@elastic/safer-lodash-set/fp';
import { get, keyBy, noop, pick, isEmpty } from 'lodash/fp';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from 'react';
import memoizeOne from 'memoize-one';
import { IIndexPattern } from 'src/plugins/data/public';

import { DEFAULT_INDEX_KEY, NO_ALERT_INDEX } from '../../../../common/constants';
import { useKibana, useUiSetting$ } from '../../lib/kibana';

import { IndexField, SourceQuery } from '../../../graphql/types';

import { sourceQuery } from './index.gql_query';
import { useApolloClient } from '../../utils/apollo_context';
import { SOURCERER_FEATURE_FLAG_ON } from '../../components/sourcerer/constants';

export { sourceQuery };

export interface BrowserField {
  aggregatable: boolean;
  category: string;
  description: string | null;
  example: string | number | null;
  fields: Readonly<Record<string, Partial<BrowserField>>>;
  format: string;
  indexes: string[];
  name: string;
  searchable: boolean;
  type: string;
}

export interface DocValueFields {
  field: string;
  format: string;
}

export type BrowserFields = Readonly<Record<string, Partial<BrowserField>>>;

export const getAllBrowserFields = (browserFields: BrowserFields): Array<Partial<BrowserField>> =>
  Object.values(browserFields).reduce<Array<Partial<BrowserField>>>(
    (acc, namespace) => [
      ...acc,
      ...Object.values(namespace.fields != null ? namespace.fields : {}),
    ],
    []
  );

export const getAllFieldsByName = (
  browserFields: BrowserFields
): { [fieldName: string]: Partial<BrowserField> } =>
  keyBy('name', getAllBrowserFields(browserFields));

export const getIndexFields = memoizeOne(
  (title: string, fields: IndexField[]): IIndexPattern =>
    fields && fields.length > 0
      ? {
          fields: fields.map((field) =>
            pick(['name', 'searchable', 'type', 'aggregatable', 'esTypes', 'subType'], field)
          ),
          title,
        }
      : { fields: [], title },
  (newArgs, lastArgs) => newArgs[0] === lastArgs[0] && newArgs[1].length === lastArgs[1].length
);

export const getBrowserFields = memoizeOne(
  (_title: string, fields: IndexField[]): BrowserFields =>
    fields && fields.length > 0
      ? fields.reduce<BrowserFields>(
          (accumulator: BrowserFields, field: IndexField) =>
            set([field.category, 'fields', field.name], field, accumulator),
          {}
        )
      : {},
  // Update the value only if _title has changed
  (newArgs, lastArgs) => newArgs[0] === lastArgs[0]
);

export const getDocValueFields = memoizeOne(
  (_title: string, fields: IndexField[]): DocValueFields[] =>
    fields && fields.length > 0
      ? fields.reduce<DocValueFields[]>((accumulator: DocValueFields[], field: IndexField) => {
          if (field.type === 'date' && accumulator.length < 100) {
            const format: string =
              field.format != null && !isEmpty(field.format) ? field.format : 'date_time';
            return [
              ...accumulator,
              {
                field: field.name,
                format,
              },
            ];
          }
          return accumulator;
        }, [])
      : [],
  // Update the value only if _title has changed
  (newArgs, lastArgs) => newArgs[0] === lastArgs[0]
);

export const indicesExistOrDataTemporarilyUnavailable = (
  indicesExist: boolean | null | undefined
) => indicesExist || isUndefined(indicesExist);

const EMPTY_BROWSER_FIELDS = {};
const EMPTY_DOCVALUE_FIELD: DocValueFields[] = [];

interface ManageSource {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  errorMessage: string | null;
  id: string;
  indexPattern: IIndexPattern;
  indexPatterns: string[];
  indicesExist: boolean | undefined | null;
  loading: boolean;
}

interface ManageSourceInit {
  browserFields?: BrowserFields;
  docValueFields?: DocValueFields[];
  errorMessage?: string | null;
  id: string;
  indexPattern?: IIndexPattern;
  indexPatterns?: string[];
  indicesExist?: boolean | undefined | null;
  loading?: boolean;
}
const getSourceDefaults = (id: string, defaultIndex: string[]) => ({
  browserFields: EMPTY_BROWSER_FIELDS,
  docValueFields: EMPTY_DOCVALUE_FIELD,
  errorMessage: null,
  id,
  indexPattern: getIndexFields(defaultIndex.join(), []),
  indexPatterns: defaultIndex,
  indicesExist: indicesExistOrDataTemporarilyUnavailable(undefined),
  loading: true,
});

type ActionManageSource =
  | {
      type: 'SET_SOURCE';
      id: string;
      defaultIndex: string[];
      payload: ManageSourceInit;
    }
  | {
      type: 'SET_IS_SOURCE_LOADING';
      id: string;
      payload: boolean;
    };

interface ManageSourceById {
  [id: string]: ManageSource;
}
const initManageSource: ManageSourceById = {};

const reducerManageSource = (state: ManageSourceById, action: ActionManageSource) => {
  switch (action.type) {
    case 'SET_SOURCE':
      return {
        ...state,
        [action.id]: {
          ...getSourceDefaults(action.id, action.defaultIndex),
          ...state[action.id],
          ...action.payload,
        },
      };
    case 'SET_IS_SOURCE_LOADING':
      return {
        ...state,
        [action.id]: {
          ...state[action.id],
          id: action.id,
          loading: action.payload,
        },
      };
    default:
      return state;
  }
};

export interface UseSourceManager {
  getActiveSourceGroupId: () => string;
  getAvailableIndexPatterns: () => string[];
  getAvailableSourceGroupIds: () => string[];
  getManageSourceById: (id: string) => ManageSource;
  initializeSource: (
    id: string,
    indexToAdd?: string[] | null,
    onlyCheckIndexToAdd?: boolean
  ) => void;
  isIndexPatternsLoading: boolean;
  setActiveSourceGroupId: (id: string) => void;
  updateIndicies: (id: string, updatedIndicies: string[]) => void;
}

export enum SourceGroups {
  default = 'default',
  host = 'host',
  detections = 'detections',
  timeline = 'timeline',
  network = 'network',
}

const sourceGroups = {
  [SourceGroups.default]: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  [SourceGroups.host]: [
    'apm-*-transaction*',
    'endgame-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  [SourceGroups.detections]: ['signals-*'],
  [SourceGroups.timeline]: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  [SourceGroups.network]: ['auditbeat-*', 'filebeat-*'],
};

export interface IndexPatternRefs {
  id: string;
  title: string;
}

export const useSourceManager = (): UseSourceManager => {
  const {
    services: {
      data: { indexPatterns },
    },
  } = useKibana();
  const [configIndex] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);

  const getDefaultIndex = useCallback(
    (indexToAdd?: string[] | null, onlyCheckIndexToAdd?: boolean) => {
      const filterIndexAdd = (indexToAdd ?? []).filter((item) => item !== NO_ALERT_INDEX);
      if (!isEmpty(filterIndexAdd)) {
        return onlyCheckIndexToAdd ? filterIndexAdd : [...configIndex, ...filterIndexAdd];
      }
      return configIndex;
    },
    [configIndex]
  );
  const [state, dispatch] = useReducer(reducerManageSource, initManageSource);
  const [activeSourceGroupId, setActiveSourceGroupId] = useState<string>(SourceGroups.default);
  const [isIndexPatternsLoading, setIsIndexPatternsLoading] = useState<boolean>(true);
  const apolloClient = useApolloClient();
  const setIsSourceLoading = useCallback(({ id, loading }: { id: string; loading: boolean }) => {
    dispatch({
      type: 'SET_IS_SOURCE_LOADING',
      id,
      payload: loading,
    });
  }, []);
  // Kibana Index Patterns
  const [availableIndexPatterns, setAvailableIndexPatterns] = useState<string[]>([]);
  const getAvailableIndexPatterns = useCallback(() => availableIndexPatterns, [
    availableIndexPatterns,
  ]);
  const getKibanaIndexPatterns = useCallback(() => {
    setIsIndexPatternsLoading(true);
    const abortCtrl = new AbortController();
    async function fetchTitles() {
      try {
        const result = await indexPatterns.getTitles();
        setAvailableIndexPatterns(result);
        setIsIndexPatternsLoading(false);
      } catch (error) {
        setIsIndexPatternsLoading(false);
      }
    }

    fetchTitles();

    return () => {
      return abortCtrl.abort();
    };
  }, [indexPatterns]);
  // Security Solution Source
  const enrichSource = useCallback(
    (id: string, indexToAdd?: string[] | null, onlyCheckIndexToAdd?: boolean) => {
      let isSubscribed = true;
      const abortCtrl = new AbortController();
      const defaultIndex = getDefaultIndex(indexToAdd, onlyCheckIndexToAdd);
      async function fetchSource() {
        if (!apolloClient) return;
        setIsSourceLoading({ id, loading: true });

        try {
          const result = await apolloClient.query<SourceQuery.Query, SourceQuery.Variables>({
            query: sourceQuery,
            fetchPolicy: 'network-only',
            variables: {
              sourceId: 'default', // always
              defaultIndex,
            },
            context: {
              fetchOptions: {
                signal: abortCtrl.signal,
              },
            },
          });

          if (isSubscribed) {
            dispatch({
              type: 'SET_SOURCE',
              id,
              defaultIndex,
              payload: {
                browserFields: getBrowserFields(
                  defaultIndex.join(),
                  get('data.source.status.indexFields', result)
                ),
                docValueFields: getDocValueFields(
                  defaultIndex.join(),
                  get('data.source.status.indexFields', result)
                ),
                errorMessage: null,
                id,
                indexPattern: getIndexFields(
                  defaultIndex.join(),
                  get('data.source.status.indexFields', result)
                ),
                indexPatterns: defaultIndex,
                indicesExist: indicesExistOrDataTemporarilyUnavailable(
                  get('data.source.status.indicesExist', result)
                ),
                loading: false,
              },
            });
          }
        } catch (error) {
          if (isSubscribed) {
            dispatch({
              type: 'SET_SOURCE',
              id,
              defaultIndex,
              payload: {
                errorMessage: error.message,
                id,
                loading: false,
              },
            });
          }
        }
      }

      fetchSource();

      return () => {
        isSubscribed = false;
        return abortCtrl.abort();
      };
    },
    [apolloClient, getDefaultIndex, setIsSourceLoading]
  );

  const initializeSource = useCallback(
    (id: string, indexToAdd?: string[] | null, onlyCheckIndexToAdd?: boolean) =>
      enrichSource(id, indexToAdd, onlyCheckIndexToAdd),
    [enrichSource]
  );

  const updateSourceIndicies = useCallback(
    (id: string, updatedIndicies: string[]) => enrichSource(id, updatedIndicies, true),
    [enrichSource]
  );
  // Security Solution Source Groups
  const getManageSourceById = useCallback(
    (id = SourceGroups.default): ManageSource => {
      if (state[id] != null) {
        return { ...getSourceDefaults(id, getDefaultIndex()), ...state[id] };
      }
      return getSourceDefaults(id, getDefaultIndex());
    },
    [getDefaultIndex, state]
  );

  const getAvailableSourceGroupIds = useCallback(() => {
    return Object.keys(state);
  }, [state]);

  const getActiveSourceGroupId = useCallback(() => activeSourceGroupId, [activeSourceGroupId]);

  const setSourceGroupId = useCallback(
    (id: string) => {
      if (getAvailableSourceGroupIds().includes(id)) {
        setActiveSourceGroupId(id);
      }
    },
    [getAvailableSourceGroupIds]
  );

  // load initial default index
  useEffect(() => {
    getKibanaIndexPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isIndexPatternsLoading) {
      Object.entries(sourceGroups).forEach(([key, value]) => initializeSource(key, value, true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIndexPatternsLoading]);

  return {
    getActiveSourceGroupId,
    getAvailableIndexPatterns,
    getAvailableSourceGroupIds,
    getManageSourceById,
    initializeSource,
    isIndexPatternsLoading,
    setActiveSourceGroupId: setSourceGroupId,
    updateIndicies: updateSourceIndicies,
  };
};

const init: UseSourceManager = {
  getActiveSourceGroupId: () => SourceGroups.default,
  getAvailableIndexPatterns: () => [],
  getAvailableSourceGroupIds: () => [],
  getManageSourceById: (id: string) => getSourceDefaults(id, []),
  initializeSource: () => noop,
  isIndexPatternsLoading: true,
  setActiveSourceGroupId: (id: string) => noop,
  updateIndicies: () => noop,
};
const ManageSourceContext = createContext<UseSourceManager>(init);

export const useManageSource = () => useContext(ManageSourceContext);

interface ManageSourceProps {
  children: React.ReactNode;
}

export const MaybeManageSource = ({ children }: ManageSourceProps) => {
  const indexPatternManager = useSourceManager();
  return (
    <ManageSourceContext.Provider value={indexPatternManager}>
      {children}
    </ManageSourceContext.Provider>
  );
};
export const ManageSource = SOURCERER_FEATURE_FLAG_ON
  ? MaybeManageSource
  : ({ children }: ManageSourceProps) => <>{children}</>;

// interface UseWithSourceState {
//   browserFields: BrowserFields;
//   docValueFields: DocValueFields[];
//   errorMessage: string | null;
//   indexPattern: IIndexPattern;
//   indicesExist: boolean | undefined | null;
//   loading: boolean;
// }
//
// export const useWithSource = (
//   sourceId = 'default',
//   indexToAdd?: string[] | null,
//   onlyCheckIndexToAdd?: boolean,
//   // Fun fact: When using this hook multiple times within a component (e.g. add_exception_modal & edit_exception_modal),
//   // the apolloClient will perform queryDeduplication and prevent the first query from executing. A deep compare is not
//   // performed on `indices`, so another field must be passed to circumvent this.
//   // For details, see https://github.com/apollographql/react-apollo/issues/2202
//   queryDeduplication = 'default'
// ) => {
//   const [configIndex] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
//   const defaultIndex = useMemo<string[]>(() => {
//     const filterIndexAdd = (indexToAdd ?? []).filter((item) => item !== NO_ALERT_INDEX);
//     if (!isEmpty(filterIndexAdd)) {
//       return onlyCheckIndexToAdd ? filterIndexAdd : [...configIndex, ...filterIndexAdd];
//     }
//     return configIndex;
//   }, [configIndex, indexToAdd, onlyCheckIndexToAdd]);
//
//   const [state, setState] = useState<UseWithSourceState>({
//     browserFields: EMPTY_BROWSER_FIELDS,
//     docValueFields: EMPTY_DOCVALUE_FIELD,
//     errorMessage: null,
//     indexPattern: getIndexFields(defaultIndex.join(), []),
//     indicesExist: indicesExistOrDataTemporarilyUnavailable(undefined),
//     loading: true,
//   });
//
//   const apolloClient = useApolloClient();
//
//   useEffect(() => {
//     let isSubscribed = true;
//     const abortCtrl = new AbortController();
//
//     async function fetchSource() {
//       if (!apolloClient) return;
//       setState((prevState) => ({ ...prevState, loading: true }));
//
//       try {
//         const result = await apolloClient.query<
//           SourceQuery.Query,
//           SourceQuery.Variables & { queryDeduplication: string }
//         >({
//           query: sourceQuery,
//           fetchPolicy: 'cache-first',
//           variables: {
//             sourceId,
//             defaultIndex,
//             queryDeduplication,
//           },
//           context: {
//             fetchOptions: {
//               signal: abortCtrl.signal,
//             },
//           },
//         });
//
//         if (isSubscribed) {
//           setState({
//             loading: false,
//             indicesExist: indicesExistOrDataTemporarilyUnavailable(
//               get('data.source.status.indicesExist', result)
//             ),
//             browserFields: getBrowserFields(
//               defaultIndex.join(),
//               get('data.source.status.indexFields', result)
//             ),
//             docValueFields: getDocValueFields(
//               defaultIndex.join(),
//               get('data.source.status.indexFields', result)
//             ),
//             indexPattern: getIndexFields(
//               defaultIndex.join(),
//               get('data.source.status.indexFields', result)
//             ),
//             errorMessage: null,
//           });
//         }
//       } catch (error) {
//         if (isSubscribed) {
//           setState((prevState) => ({
//             ...prevState,
//             loading: false,
//             errorMessage: error.message,
//           }));
//         }
//       }
//     }
//
//     fetchSource();
//
//     return () => {
//       isSubscribed = false;
//       return abortCtrl.abort();
//     };
//   }, [apolloClient, sourceId, defaultIndex, queryDeduplication]);
//
//   return state;
// };
