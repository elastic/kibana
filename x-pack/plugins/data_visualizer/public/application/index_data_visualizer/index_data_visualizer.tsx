/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import '../_index.scss';
import { pick } from 'lodash';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { parse, stringify } from 'query-string';
import { isEqual } from 'lodash';
import { encode } from '@kbn/rison';
import { i18n } from '@kbn/i18n';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  KibanaContextProvider,
  KibanaThemeProvider,
  toMountPoint,
  wrapWithTheme,
} from '@kbn/kibana-react-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { DataView } from '@kbn/data-views-plugin/public';
import { getNestedProperty } from '@kbn/ml-nested-property';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import {
  Provider as UrlStateContextProvider,
  parseUrlState,
  isRisonSerializationRequired,
  type Accessor,
  type Dictionary,
  type SetUrlState,
} from '@kbn/ml-url-state';
import { getSavedSearch, SavedSearch } from '@kbn/saved-search-plugin/public';
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

const XXL_BREAKPOINT = 1400;

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
  const [currentSavedSearch, setCurrentSavedSearch] = useState<SavedSearch | null>(null);

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
          const savedSearch = await getSavedSearch(savedSearchId, {
            search,
            savedObjectsClient,
          });
          const dataView = savedSearch.searchSource.getField('index');

          if (!dataView) {
            toasts.addDanger({
              title: i18n.translate('xpack.dataVisualizer.index.dataViewErrorMessage', {
                defaultMessage: 'Error finding data view',
              }),
            });
          }
          setCurrentSavedSearch(savedSearch);
          setCurrentDataView(dataView);
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
          currentSessionId={currentSessionId}
          getAdditionalLinks={getAdditionalLinks}
        />
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
  const datePickerDeps = {
    ...pick(services, ['data', 'http', 'notifications', 'theme', 'uiSettings']),
    toMountPoint,
    wrapWithTheme,
    uiSettingsKeys: UI_SETTINGS,
  };

  return (
    <KibanaThemeProvider
      theme$={coreStart.theme.theme$}
      modify={{
        breakpoint: {
          xxl: XXL_BREAKPOINT,
        },
      }}
    >
      <KibanaContextProvider services={{ ...services }}>
        <StorageContextProvider storage={localStorage} storageKeys={DV_STORAGE_KEYS}>
          <DatePickerContextProvider {...datePickerDeps}>
            <DataVisualizerStateContextProvider
              IndexDataVisualizerComponent={IndexDataVisualizerView}
              getAdditionalLinks={getAdditionalLinks}
            />
          </DatePickerContextProvider>
        </StorageContextProvider>
      </KibanaContextProvider>
    </KibanaThemeProvider>
  );
};
