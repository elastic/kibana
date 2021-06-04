/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import '../_index.scss';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { parse, stringify } from 'query-string';
import { isEqual } from 'lodash';
// @ts-ignore
import { encode } from 'rison-node';
import { SimpleSavedObject } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { getCoreStart, getPluginsStart } from '../../kibana_services';
import {
  IndexDataVisualizerViewProps,
  IndexDataVisualizerView,
} from './components/index_data_visualizer_view';
import {
  Accessor,
  Provider as UrlStateContextProvider,
  Dictionary,
  parseUrlState,
  SetUrlState,
  getNestedProperty,
  isRisonSerializationRequired,
} from '../common/util/url_state';
import { useDataVisualizerKibana } from '../kibana_context';
import { IndexPattern } from '../../../../../../src/plugins/data/common/index_patterns/index_patterns';

export type IndexDataVisualizerSpec = typeof IndexDataVisualizer;

export interface DataVisualizerUrlStateContextProviderProps extends IndexDataVisualizerViewProps {
  IndexDataVisualizerComponent: FC<IndexDataVisualizerViewProps>;
}

export const DataVisualizerUrlStateContextProvider: FC<DataVisualizerUrlStateContextProviderProps> = ({
  IndexDataVisualizerComponent,
  ...restProps
}) => {
  const {
    services: {
      data: { indexPatterns },
      savedObjects: { client: savedObjectsClient },
      notifications: { toasts },
    },
  } = useDataVisualizerKibana();
  const history = useHistory();

  const [currentIndexPattern, setCurrentIndexPattern] = useState<IndexPattern | undefined>(
    undefined
  );
  const [currentSavedSearch, setCurrentSavedSearch] = useState<SimpleSavedObject<unknown> | null>(
    null
  );
  const { search: searchString } = useLocation();

  useEffect(() => {
    const prevSearchString = searchString;
    const parsedQueryString = parse(prevSearchString, { sort: false });

    const getIndexPattern = async () => {
      if (typeof parsedQueryString?.index === 'string') {
        const indexPattern = await indexPatterns.get(parsedQueryString.index);
        setCurrentIndexPattern(indexPattern);
      }

      if (typeof parsedQueryString?.savedSearchId === 'string') {
        const savedSearchId = parsedQueryString.savedSearchId;
        try {
          const savedSearch = await savedObjectsClient.get('search', savedSearchId);
          const indexPatternId = savedSearch.references.find((ref) => ref.type === 'index-pattern')
            ?.id;
          if (indexPatternId !== undefined) {
            try {
              const indexPattern = await indexPatterns.get(indexPatternId);
              setCurrentIndexPattern(indexPattern);
            } catch (e) {
              toasts.addError(e, {
                title: i18n.translate('xpack.dataVisualizer.index.indexPatternErrorMessage', {
                  defaultMessage: 'Error finding index pattern',
                }),
              });
            }
          }
          setCurrentSavedSearch(savedSearch);
        } catch (e) {
          toasts.addError(e, {
            title: i18n.translate('xpack.dataVisualizer.index.indexPatternErrorMessage', {
              defaultMessage: 'Error retrieving saved search {savedSearchId}',
              values: { savedSearchId },
            }),
          });
        }
      }
    };
    getIndexPattern();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedObjectsClient, toasts, indexPatterns]);

  const setUrlState: SetUrlState = useCallback(
    (
      accessor: Accessor,
      attribute: string | Dictionary<any>,
      value?: any,
      replaceState?: boolean
    ) => {
      const prevSearchString = searchString;
      const urlState = parseUrlState(prevSearchString);
      const parsedQueryString = parse(prevSearchString, { sort: false });

      if (!Object.prototype.hasOwnProperty.call(urlState, accessor)) {
        urlState[accessor] = {};
      }

      if (typeof attribute === 'string') {
        if (isEqual(getNestedProperty(urlState, `${accessor}.${attribute}`), value)) {
          return prevSearchString;
        }

        urlState[accessor][attribute] = value;
      } else {
        const attributes = attribute;
        Object.keys(attributes).forEach((a) => {
          urlState[accessor][a] = attributes[a];
        });
      }

      try {
        const oldLocationSearchString = stringify(parsedQueryString, {
          sort: false,
          encode: false,
        });

        Object.keys(urlState).forEach((a) => {
          if (isRisonSerializationRequired(a)) {
            parsedQueryString[a] = encode(urlState[a]);
          } else {
            parsedQueryString[a] = urlState[a];
          }
        });
        const newLocationSearchString = stringify(parsedQueryString, {
          sort: false,
          encode: false,
        });

        if (oldLocationSearchString !== newLocationSearchString) {
          const newSearchString = stringify(parsedQueryString, { sort: false });
          if (replaceState) {
            history.replace({ search: newSearchString });
          } else {
            history.push({ search: newSearchString });
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Could not save url state', error);
      }
    },
    [history, searchString]
  );

  return (
    <UrlStateContextProvider value={{ searchString, setUrlState }}>
      {currentIndexPattern ? (
        <IndexDataVisualizerComponent
          {...restProps}
          currentIndexPattern={currentIndexPattern}
          currentSavedSearch={currentSavedSearch}
        />
      ) : (
        <div />
      )}
    </UrlStateContextProvider>
  );
};

export const IndexDataVisualizer: FC<IndexDataVisualizerViewProps> = (props) => {
  const coreStart = getCoreStart();
  const {
    data,
    maps,
    embeddable,
    share,
    security,
    fileUpload,
    indexPatternFieldEditor,
  } = getPluginsStart();
  const services = {
    data,
    maps,
    embeddable,
    share,
    security,
    fileUpload,
    indexPatternFieldEditor,
    ...coreStart,
  };

  return (
    <KibanaContextProvider services={{ ...services }}>
      <DataVisualizerUrlStateContextProvider
        IndexDataVisualizerComponent={IndexDataVisualizerView}
        {...props}
      />
    </KibanaContextProvider>
  );
};
