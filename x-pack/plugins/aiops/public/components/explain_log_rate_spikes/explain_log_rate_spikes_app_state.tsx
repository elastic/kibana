/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import { parse, stringify } from 'query-string';
import { isEqual } from 'lodash';
import { encode } from 'rison-node';
import { useHistory, useLocation } from 'react-router-dom';

import { EuiCallOut } from '@elastic/eui';

import type { Filter, Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';

import type { SavedSearch } from '@kbn/discover-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';

import {
  SEARCH_QUERY_LANGUAGE,
  SearchQueryLanguage,
  SavedSearchSavedObject,
} from '../../application/utils/search_utils';
import {
  Accessor,
  Dictionary,
  parseUrlState,
  Provider as UrlStateContextProvider,
  isRisonSerializationRequired,
  getNestedProperty,
  SetUrlState,
} from '../../hooks/use_url_state';
import type { AiopsAppDependencies } from '../../hooks/use_aiops_app_context';
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';

import { ExplainLogRateSpikesPage } from './explain_log_rate_spikes_page';

export interface ExplainLogRateSpikesAppStateProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** The saved search to analyze. */
  savedSearch: SavedSearch | SavedSearchSavedObject | null;
  /** App dependencies */
  appDependencies: AiopsAppDependencies;
}

const defaultSearchQuery = {
  match_all: {},
};

export interface AiOpsIndexBasedAppState {
  searchString?: Query['query'];
  searchQuery?: Query['query'];
  searchQueryLanguage: SearchQueryLanguage;
  filters?: Filter[];
}

export const getDefaultAiOpsListState = (
  overrides?: Partial<AiOpsIndexBasedAppState>
): Required<AiOpsIndexBasedAppState> => ({
  searchString: '',
  searchQuery: defaultSearchQuery,
  searchQueryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
  filters: [],
  ...overrides,
});

export const restorableDefaults = getDefaultAiOpsListState();

export const ExplainLogRateSpikesAppState: FC<ExplainLogRateSpikesAppStateProps> = ({
  dataView,
  savedSearch,
  appDependencies,
}) => {
  const history = useHistory();
  const { search: urlSearchString } = useLocation();

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

  if (!dataView) return null;

  if (!dataView.isTimeBased()) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.aiops.index.dataViewNotBasedOnTimeSeriesNotificationTitle', {
          defaultMessage: 'The data view "{dataViewTitle}" is not based on a time series.',
          values: { dataViewTitle: dataView.getName() },
        })}
        color="danger"
        iconType="alert"
      >
        <p>
          {i18n.translate('xpack.aiops.index.dataViewNotBasedOnTimeSeriesNotificationDescription', {
            defaultMessage: 'Log rate spike analysis only runs over time-based indices.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  return (
    <AiopsAppContext.Provider value={appDependencies}>
      <UrlStateContextProvider value={{ searchString: urlSearchString, setUrlState }}>
        <ExplainLogRateSpikesPage dataView={dataView} savedSearch={savedSearch} />
      </UrlStateContextProvider>
    </AiopsAppContext.Provider>
  );
};
