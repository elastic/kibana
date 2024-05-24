/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { initializeTimeRange, initializeTitles, useFetchContext } from '@kbn/presentation-publishing';
import type { LogStreamApi, LogStreamSerializedState, Services } from './types';
import { datemathToEpochMillis } from '../../utils/datemath';
import { LogStream } from '@kbn/logs-shared-plugin/public';
import { LOG_STREAM_EMBEDDABLE } from './constants';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { CoreProviders } from '../../apps/common_providers';
import { Query } from '@kbn/es-query';

export function getLogStreamEmbeddableFactory(services: Services) {
  const factory: ReactEmbeddableFactory<
    LogStreamSerializedState,
    LogStreamApi
  > = {
    type: LOG_STREAM_EMBEDDABLE,
    deserializeState: (state) => state.rawState,
    buildEmbeddable: async (state, buildApi) => {
      const timeRange = initializeTimeRange(state);
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);

      const api = buildApi(
        {
          ...timeRange.api,
          ...titlesApi,
          serializeState: () => {
            return {
              rawState: {
                ...timeRange.serialize(),
                ...serializeTitles()
              },
            };
          },
        },
        {
          ...timeRange.comparators,
          ...titleComparators
        }
      );

      return {
        api,
        Component: () => {
          const { filters, query, timeRange } = useFetchContext(api);
          const { startTimestamp, endTimestamp } = useMemo(() => {
            return {
              startTimestamp: timeRange ? datemathToEpochMillis(timeRange.from) : undefined,
              endTimestamp: timeRange ? datemathToEpochMillis(timeRange.to, 'up') : undefined,
            };
          }, [timeRange]);

          const [darkMode, setDarkMode] = useState(false);
          useEffect(() => {
            const subscription = services.coreStart.theme.theme$.subscribe((theme) => {
              setDarkMode(theme.darkMode);
            });
            return () => subscription.unsubscribe();
          }, [services.coreStart.theme.theme$]);
          
          return !startTimestamp || !endTimestamp
            ? null
            : <CoreProviders
                core={services.coreStart}
                plugins={services.pluginDeps}
                pluginStart={services.pluginStart}
                theme$={services.coreStart.theme.theme$}
              >
                <EuiThemeProvider darkMode={darkMode}>
                  <div style={{ width: '100%' }}>
                    <LogStream
                      logView={{ type: 'log-view-reference', logViewId: 'default' }}
                      startTimestamp={startTimestamp}
                      endTimestamp={endTimestamp}
                      height="100%"
                      query={query as Query | undefined}
                      filters={filters}
                    />
                  </div>
                </EuiThemeProvider>
              </CoreProviders>;
        },
      };
    },
  };
  return factory;
}