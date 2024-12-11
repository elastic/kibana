/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiLink, useEuiTheme } from '@elastic/eui';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  initializeTimeRange,
  initializeTitles,
  useFetchContext,
} from '@kbn/presentation-publishing';
import { LogStream } from '@kbn/logs-shared-plugin/public';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { Query } from '@kbn/es-query';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { FormattedMessage } from '@kbn/i18n-react';
import type { LogStreamApi, LogStreamSerializedState, Services } from './types';
import { datemathToEpochMillis } from '../../utils/datemath';
import { LOG_STREAM_EMBEDDABLE } from './constants';
import { useKibanaContextForPluginProvider } from '../../hooks/use_kibana';
import { InfraClientStartDeps, InfraClientStartExports } from '../../types';

export function getLogStreamEmbeddableFactory(services: Services) {
  const factory: ReactEmbeddableFactory<
    LogStreamSerializedState,
    LogStreamSerializedState,
    LogStreamApi
  > = {
    type: LOG_STREAM_EMBEDDABLE,
    deserializeState: (state) => state.rawState,
    buildEmbeddable: async (state, buildApi) => {
      const timeRangeContext = initializeTimeRange(state);
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);

      const api = buildApi(
        {
          ...timeRangeContext.api,
          ...titlesApi,
          serializeState: () => {
            return {
              rawState: {
                ...timeRangeContext.serialize(),
                ...serializeTitles(),
              },
            };
          },
        },
        {
          ...timeRangeContext.comparators,
          ...titleComparators,
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
          }, []);

          return !startTimestamp || !endTimestamp ? null : (
            <LogStreamEmbeddableProviders
              core={services.coreStart}
              plugins={services.pluginDeps}
              pluginStart={services.pluginStart}
              theme$={services.coreStart.theme.theme$}
            >
              <EuiThemeProvider darkMode={darkMode}>
                <div style={{ width: '100%', position: 'relative' }}>
                  <LogStream
                    logView={{ type: 'log-view-reference', logViewId: 'default' }}
                    startTimestamp={startTimestamp}
                    endTimestamp={endTimestamp}
                    height="100%"
                    query={query as Query | undefined}
                    filters={filters}
                  />
                  <DeprecationCallout />
                </div>
              </EuiThemeProvider>
            </LogStreamEmbeddableProviders>
          );
        },
      };
    },
  };
  return factory;
}

const DISMISSAL_STORAGE_KEY = 'observability:logStreamEmbeddableDeprecationCalloutDismissed';
const SAVED_SEARCH_DOCS_URL =
  'https://www.elastic.co/guide/en/kibana/current/save-open-search.html';

const DeprecationCallout = () => {
  const { euiTheme } = useEuiTheme();
  const [isDismissed, setDismissed] = useLocalStorage(DISMISSAL_STORAGE_KEY, false);

  if (isDismissed) {
    return null;
  }

  return (
    <EuiCallOut
      color="warning"
      iconType="help"
      onDismiss={() => setDismissed(true)}
      css={{
        position: 'absolute',
        bottom: euiTheme.size.m,
        right: euiTheme.size.m,
        width: 'min(100%, 40ch)',
      }}
    >
      <p>
        <FormattedMessage
          id="xpack.infra.logsStreamEmbeddable.deprecationWarningDescription"
          defaultMessage="Logs Stream panels are no longer maintained. Try using {savedSearchDocsLink} for a similar visualization."
          values={{
            savedSearchDocsLink: (
              <EuiLink
                data-test-subj="infraDeprecationCalloutSavedSearchesLink"
                href={SAVED_SEARCH_DOCS_URL}
                target="_blank"
              >
                {i18n.translate(
                  'xpack.infra.logsStreamEmbeddable.deprecationWarningDescription.savedSearchesLinkLabel',
                  { defaultMessage: 'saved searches' }
                )}
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiCallOut>
  );
};

export interface LogStreamEmbeddableProvidersProps {
  core: CoreStart;
  pluginStart: InfraClientStartExports;
  plugins: InfraClientStartDeps;
  theme$: AppMountParameters['theme$'];
}

export const LogStreamEmbeddableProviders: FC<
  PropsWithChildren<LogStreamEmbeddableProvidersProps>
> = ({ children, core, pluginStart, plugins }) => {
  const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(
    core,
    plugins,
    pluginStart
  );

  return (
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProviderForPlugin services={{ ...core, ...plugins, ...pluginStart }}>
        {children}
      </KibanaContextProviderForPlugin>
    </KibanaRenderContextProvider>
  );
};
