/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import '../_index.scss';
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { parse, stringify } from 'query-string';
import { isEqual, throttle } from 'lodash';
import { EuiResizeObserver } from '@elastic/eui';
import { encode } from '@kbn/rison';
import { SimpleSavedObject } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { DataView } from '@kbn/data-views-plugin/public';
import { getNestedProperty } from '@kbn/ml-nested-property';
import {
  Provider as UrlStateContextProvider,
  parseUrlState,
  isRisonSerializationRequired,
  type Accessor,
  type Dictionary,
  type SetUrlState,
} from '@kbn/ml-url-state';
import { getCoreStart, getPluginsStart } from '../../kibana_services';
import {
  IndexDataVisualizerViewProps,
  IndexDataVisualizerView,
} from './components/index_data_visualizer_view';
import { useDataVisualizerKibana } from '../kibana_context';
import { GetAdditionalLinks } from '../common/components/results_links';
import { DATA_VISUALIZER_APP_LOCATOR, IndexDataVisualizerLocatorParams } from './locator';
import { DATA_VISUALIZER_INDEX_VIEWER } from './constants/index_data_visualizer_viewer';
import { INDEX_DATA_VISUALIZER_NAME } from '../common/constants';
import { DV_STORAGE_KEYS } from './types/storage';

const localStorage = new Storage(window.localStorage);

export interface DataVisualizerStateContextProviderProps {
  IndexDataVisualizerComponent: FC<IndexDataVisualizerViewProps>;
  getAdditionalLinks?: GetAdditionalLinks;
}
export type IndexDataVisualizerSpec = typeof IndexDataVisualizer;

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

export const DataVisualizerStateContextProvider: FC<DataVisualizerStateContextProviderProps> = ({
  IndexDataVisualizerComponent,
  getAdditionalLinks,
}) => {
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

  const [panelWidth, setPanelWidth] = useState(1600);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resizeHandler = useCallback(
    throttle((e: { width: number; height: number }) => {
      // When window or table is resized,
      // update the page body width
      setPanelWidth(e.width);
    }, 500),
    []
  );
  const compact = useMemo(() => panelWidth <= 1024, [panelWidth]);

  return (
    <UrlStateContextProvider value={{ searchString: urlSearchString, setUrlState }}>
      {currentDataView ? (
        // Needs ResizeObserver to measure window width - side bar navigation
        <EuiResizeObserver onResize={resizeHandler}>
          {(resizeRef) => (
            <div ref={resizeRef}>
              <IndexDataVisualizerComponent
                currentDataView={currentDataView}
                currentSavedSearch={currentSavedSearch}
                currentSessionId={currentSessionId}
                getAdditionalLinks={getAdditionalLinks}
                compact={compact}
              />
            </div>
          )}
        </EuiResizeObserver>
      ) : (
        <div />
      )}
    </UrlStateContextProvider>
  );
};

export const IndexDataVisualizer: FC<{
  getAdditionalLinks?: GetAdditionalLinks;
}> = ({ getAdditionalLinks }) => {
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
    unifiedSearch,
    ...coreStart,
  };

  return (
    <KibanaThemeProvider theme$={coreStart.theme.theme$}>
      <KibanaContextProvider services={{ ...services }}>
        <StorageContextProvider storage={localStorage} storageKeys={DV_STORAGE_KEYS}>
          <DataVisualizerStateContextProvider
            IndexDataVisualizerComponent={IndexDataVisualizerView}
            getAdditionalLinks={getAdditionalLinks}
          />
        </StorageContextProvider>
      </KibanaContextProvider>
    </KibanaThemeProvider>
  );
};
