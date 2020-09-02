/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { AbortError } from '../../../../../../../src/plugins/data/common';

import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { PageInfoPaginated, UncommonProcessesEdges } from '../../../graphql/types';
import { inputsModel, State } from '../../../common/store';
import { useKibana } from '../../../common/lib/kibana';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import { createFilter } from '../../../common/containers/helpers';

import { hostsModel, hostsSelectors } from '../../store';
import {
  UncommonProcessesRequestOptions,
  UncommonProcessesStrategyResponse,
} from '../../../../common/search_strategy/security_solution/hosts/uncommon_processes';
import { HostsQueries } from '../../../../common/search_strategy/security_solution/hosts';
import * as i18n from './translations';
import { DocValueFields, SortField } from '../../../../common/search_strategy/security_solution';
import { ESTermQuery } from '../../../../common/typed_json';

const ID = 'uncommonProcessesQuery';

export interface UncommonProcessesArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  isInspected: boolean;
  loadPage: (newActivePage: number) => void;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
  uncommonProcesses: UncommonProcessesEdges[];
}

// export interface OwnProps extends QueryTemplatePaginatedProps {
//   children: (args: UncommonProcessesArgs) => React.ReactNode;
//   type: hostsModel.HostsType;
// }

// type UncommonProcessesProps = OwnProps & PropsFromRedux & WithKibanaProps;

// class UncommonProcessesComponentQuery extends QueryTemplatePaginated<
//   UncommonProcessesProps,
//   GetUncommonProcessesQuery.Query,
//   GetUncommonProcessesQuery.Variables
// > {
//   public render() {
//     const {
//       activePage,
//       children,
//       endDate,
//       filterQuery,
//       id = ID,
//       isInspected,
//       kibana,
//       limit,
//       skip,
//       sourceId,
//       startDate,
//     } = this.props;
//     const variables: GetUncommonProcessesQuery.Variables = {
//       defaultIndex: kibana.services.uiSettings.get<string[]>(DEFAULT_INDEX_KEY),
//       filterQuery: createFilter(filterQuery),
//       inspect: isInspected,
//       pagination: generateTablePaginationOptions(activePage, limit),
//       sourceId,
//       timerange: {
//         interval: '12h',
//         from: startDate!,
//         to: endDate!,
//       },
//     };
//     return (
//       <Query<GetUncommonProcessesQuery.Query, GetUncommonProcessesQuery.Variables>
//         query={uncommonProcessesQuery}
//         fetchPolicy={getDefaultFetchPolicy()}
//         notifyOnNetworkStatusChange
//         skip={skip}
//         variables={variables}
//       >
//         {({ data, loading, fetchMore, networkStatus, refetch }) => {
//           const uncommonProcesses = getOr([], 'source.UncommonProcesses.edges', data);
//           this.setFetchMore(fetchMore);
//           this.setFetchMoreOptions((newActivePage: number) => ({
//             variables: {
//               pagination: generateTablePaginationOptions(newActivePage, limit),
//             },
//             updateQuery: (prev, { fetchMoreResult }) => {
//               if (!fetchMoreResult) {
//                 return prev;
//               }
//               return {
//                 ...fetchMoreResult,
//                 source: {
//                   ...fetchMoreResult.source,
//                   UncommonProcesses: {
//                     ...fetchMoreResult.source.UncommonProcesses,
//                     edges: [...fetchMoreResult.source.UncommonProcesses.edges],
//                   },
//                 },
//               };
//             },
//           }));
//           const isLoading = this.isItAValidLoading(loading, variables, networkStatus);
//           return children({
//             id,
//             inspect: getOr(null, 'source.UncommonProcesses.inspect', data),
//             isInspected,
//             loading: isLoading,
//             loadPage: this.wrappedLoadMore,
//             pageInfo: getOr({}, 'source.UncommonProcesses.pageInfo', data),
//             refetch: this.memoizedRefetchQuery(variables, limit, refetch),
//             totalCount: getOr(-1, 'source.UncommonProcesses.totalCount', data),
//             uncommonProcesses,
//           });
//         }}
//       </Query>
//     );
//   }
// }

// const makeMapStateToProps = () => {
//   const getUncommonProcessesSelector = hostsSelectors.uncommonProcessesSelector();
//   const getQuery = inputsSelectors.globalQueryByIdSelector();
//   const mapStateToProps = (state: State, { type, id = ID }: OwnProps) => {
//     const { isInspected } = getQuery(state, id);
//     return {
//       ...getUncommonProcessesSelector(state, type),
//       isInspected,
//     };
//   };
//   return mapStateToProps;
// };

// const connector = connect(makeMapStateToProps);

// type PropsFromRedux = ConnectedProps<typeof connector>;

// export const UncommonProcessesQuery = compose<React.ComponentClass<OwnProps>>(
//   connector,
//   withKibana
// )(UncommonProcessesComponentQuery);

interface UseUncommonProcesses {
  docValueFields?: DocValueFields[];
  filterQuery?: ESTermQuery | string;
  endDate: string;
  skip?: boolean;
  startDate: string;
  type: hostsModel.HostsType;
}

export const useUncommonProcesses = ({
  docValueFields,
  filterQuery,
  endDate,
  skip = false,
  startDate,
  type,
}: UseUncommonProcesses): [boolean, UncommonProcessesArgs] => {
  const getUncommonProcessesSelector = hostsSelectors.uncommonProcessesSelector();
  const { activePage, limit } = useSelector((state: State) =>
    getUncommonProcessesSelector(state, type)
  );
  const { data, notifications, uiSettings } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const defaultIndex = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
  const [loading, setLoading] = useState(false);
  const [uncommonProcessesRequest, setUncommonProcessesRequest] = useState<
    UncommonProcessesRequestOptions
  >({
    defaultIndex,
    docValueFields: docValueFields ?? [],
    factoryQueryType: HostsQueries.uncommonProcesses,
    filterQuery: createFilter(filterQuery),
    pagination: generateTablePaginationOptions(activePage, limit),
    timerange: {
      interval: '12h',
      from: startDate!,
      to: endDate!,
    },
    sort: {} as SortField,
  });

  const wrappedLoadMore = useCallback(
    (newActivePage: number) => {
      setUncommonProcessesRequest((prevRequest) => {
        return {
          ...prevRequest,
          pagination: generateTablePaginationOptions(newActivePage, limit),
        };
      });
    },
    [limit]
  );

  const [uncommonProcessesResponse, setUncommonProcessesResponse] = useState<UncommonProcessesArgs>(
    {
      uncommonProcesses: [],
      id: ID,
      inspect: {
        dsl: [],
        response: [],
      },
      isInspected: false,
      loadPage: wrappedLoadMore,
      pageInfo: {
        activePage: 0,
        fakeTotalCount: 0,
        showMorePagesIndicator: false,
      },
      refetch: refetch.current,
      totalCount: -1,
    }
  );

  const uncommonProcessesSearch = useCallback(
    (request: UncommonProcessesRequestOptions) => {
      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<UncommonProcessesRequestOptions, UncommonProcessesStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            signal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (!response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                  setUncommonProcessesResponse((prevResponse) => ({
                    ...prevResponse,
                    uncommonProcesses: response.edges,
                    inspect: response.inspect ?? prevResponse.inspect,
                    pageInfo: response.pageInfo,
                    refetch: refetch.current,
                    totalCount: response.totalCount,
                  }));
                }
                searchSubscription$.unsubscribe();
              } else if (response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                }
                // TODO: Make response error status clearer
                notifications.toasts.addWarning(i18n.ERROR_UNCOMMON_PROCESSES);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_UNCOMMON_PROCESSES,
                  text: msg.message,
                });
              }
            },
          });
      };
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
      return () => {
        didCancel = true;
        abortCtrl.current.abort();
      };
    },
    [data.search, notifications.toasts]
  );

  useEffect(() => {
    setUncommonProcessesRequest((prevRequest) => {
      const myRequest = {
        ...prevRequest,
        defaultIndex,
        docValueFields: docValueFields ?? [],
        filterQuery: createFilter(filterQuery),
        pagination: generateTablePaginationOptions(activePage, limit),
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
        sort: {} as SortField,
      };
      if (!skip && !deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [activePage, defaultIndex, docValueFields, endDate, filterQuery, limit, skip, startDate]);

  useEffect(() => {
    uncommonProcessesSearch(uncommonProcessesRequest);
  }, [uncommonProcessesRequest, uncommonProcessesSearch]);

  return [loading, uncommonProcessesResponse];
};
