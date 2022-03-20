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
import { encode } from 'rison-node';
import { SimpleSavedObject } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import {
  KibanaContextProvider,
  KibanaThemeProvider,
} from '../../../../../../src/plugins/kibana_react/public';
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
import { DataView } from '../../../../../../src/plugins/data_views/public';
import { ResultLink } from '../common/components/results_links';
import { DATA_VISUALIZER_APP_LOCATOR, IndexDataVisualizerLocatorParams } from './locator';
import { DATA_VISUALIZER_INDEX_VIEWER } from './constants/index_data_visualizer_viewer';
import { INDEX_DATA_VISUALIZER_NAME } from '../common/constants';

export type IndexDataVisualizerSpec = typeof IndexDataVisualizer;

export interface DataVisualizerUrlStateContextProviderProps {
  IndexDataVisualizerComponent: FC<IndexDataVisualizerViewProps>;
  additionalLinks: ResultLink[];
}

export const getLocatorParams = (params: {
  dataViewId?: string;
  savedSearchId?: string;
  urlSearchString: string;
  searchSessionId?: string;
  shouldRestoreSearchSession: boolean;
}): IndexDataVisualizerLocatorParams => {
  const urlState = parseUrlState(params.urlSearchString);

  let locatorParams: IndexDataVisualizerLocatorParams = {
    dataViewId: urlState.index,
    searchSessionId: params.searchSessionId,
  };

  if (params.savedSearchId) locatorParams.savedSearchId = params.savedSearchId;
  if (urlState) {
    if (urlState._g) {
      const { time, refreshInterval } = urlState._g;

      locatorParams.timeRange = time;
      locatorParams.refreshInterval = refreshInterval;
    }

    if (urlState._a && urlState._a[DATA_VISUALIZER_INDEX_VIEWER]) {
      locatorParams = { ...locatorParams, ...urlState._a[DATA_VISUALIZER_INDEX_VIEWER] };
    }
  }
  return locatorParams;
};

export const DataVisualizerUrlStateContextProvider: FC<
  DataVisualizerUrlStateContextProviderProps
> = ({ IndexDataVisualizerComponent, additionalLinks }) => {
  const { services } = useDataVisualizerKibana();
  const {
    data: { dataViews, search },
    savedObjects: { client: savedObjectsClient },
    notifications: { toasts },
  } = services;

  const history = useHistory();
  const { search: urlSearchString } = useLocation();

  const [currentDataView, setCurrentDataView] = useState<DataView | undefined>(undefined);
  const [currentSavedSearch, setCurrentSavedSearch] = useState<SimpleSavedObject<unknown> | null>(
    null
  );

  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const urlState = parseUrlState(urlSearchString);

    if (search.session) {
      search.session.enableStorage({
        getName: async () => {
          // return the name you want to give the saved Search Session
          return INDEX_DATA_VISUALIZER_NAME;
        },
        getLocatorData: async () => {
          return {
            id: DATA_VISUALIZER_APP_LOCATOR,
            initialState: getLocatorParams({
              ...services,
              urlSearchString,
              dataViewId: currentDataView?.id,
              savedSearchId: currentSavedSearch?.id,
              shouldRestoreSearchSession: false,
              searchSessionId: search.session.getSessionId(),
            }),
            restoreState: getLocatorParams({
              ...services,
              urlSearchString,
              dataViewId: currentDataView?.id,
              savedSearchId: currentSavedSearch?.id,
              shouldRestoreSearchSession: true,
              searchSessionId: search.session.getSessionId(),
            }),
          };
        },
      });
    }

    if (urlState.searchSessionId !== undefined && urlState.searchSessionId !== currentSessionId) {
      search.session?.restore(urlState.searchSessionId);
      setCurrentSessionId(urlState.searchSessionId);
    } else {
      const newSessionId = search.session?.start();
      setCurrentSessionId(newSessionId);
    }
    return () => {
      search.session.clear();
    };
    // urlSearchString already includes all the other dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.session, urlSearchString]);

  useEffect(() => {
    const prevSearchString = urlSearchString;
    const parsedQueryString = parse(prevSearchString, { sort: false });

    const getDataView = async () => {
      if (typeof parsedQueryString?.savedSearchId === 'string') {
        const savedSearchId = parsedQueryString.savedSearchId;
        try {
          const savedSearch = await savedObjectsClient.get('search', savedSearchId);
          const dataViewId = savedSearch.references.find((ref) => ref.type === 'index-pattern')?.id;
          if (dataViewId !== undefined && savedSearch) {
            try {
              const dataView = await dataViews.get(dataViewId);
              setCurrentSavedSearch(savedSearch);
              setCurrentDataView(dataView);
            } catch (e) {
              toasts.addError(e, {
                title: i18n.translate('xpack.dataVisualizer.index.dataViewErrorMessage', {
                  defaultMessage: 'Error finding data view',
                }),
              });
            }
          }
        } catch (e) {
          toasts.addError(e, {
            title: i18n.translate('xpack.dataVisualizer.index.savedSearchErrorMessage', {
              defaultMessage: 'Error retrieving saved search {savedSearchId}',
              values: { savedSearchId },
            }),
          });
        }
      }

      if (typeof parsedQueryString?.index === 'string') {
        const dataView = await dataViews.get(parsedQueryString.index);
        setCurrentDataView(dataView);
      }
    };
    getDataView();
  }, [savedObjectsClient, toasts, dataViews, urlSearchString]);

  const setUrlState: SetUrlState = useCallback(
    (
      accessor: Accessor,
      attribute: string | Dictionary<any>,
      value?: any,
      replaceState?: boolean
    ) => {
      const prevSearchString = urlSearchString;
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
    [history, urlSearchString]
  );

  return (
    <UrlStateContextProvider value={{ searchString: urlSearchString, setUrlState }}>
      {currentDataView ? (
        <IndexDataVisualizerComponent
          currentDataView={currentDataView}
          currentSavedSearch={currentSavedSearch}
          additionalLinks={additionalLinks}
          currentSessionId={currentSessionId}
        />
      ) : (
        <div />
      )}
    </UrlStateContextProvider>
  );
};

export const IndexDataVisualizer: FC<{ additionalLinks: ResultLink[] }> = ({ additionalLinks }) => {
  const coreStart = getCoreStart();
  const {
    data,
    maps,
    embeddable,
    discover,
    share,
    security,
    fileUpload,
    lens,
    dataViewFieldEditor,
    uiActions,
    charts,
    unifiedSearch,
  } = getPluginsStart();
  const services = {
    data,
    maps,
    embeddable,
    discover,
    share,
    security,
    fileUpload,
    lens,
    dataViewFieldEditor,
    uiActions,
    charts,
    ...coreStart,
    unifiedSearch,
  };

  return (
    <KibanaThemeProvider theme$={coreStart.theme.theme$}>
      <KibanaContextProvider services={{ ...services }}>
        <DataVisualizerUrlStateContextProvider
          IndexDataVisualizerComponent={IndexDataVisualizerView}
          additionalLinks={additionalLinks}
        />
      </KibanaContextProvider>
    </KibanaThemeProvider>
  );
};
