/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { NoDataPageProps } from '@kbn/shared-ux-page-no-data-types';
import { AsyncStatus, useAsync } from '../hooks/use_async';
import { useAutoAbortedHttpClient } from '../hooks/use_auto_aborted_http_client';
import { useProfilingDependencies } from './contexts/profiling_dependencies/use_profiling_dependencies';
import { ProfilingAppPageTemplate } from './profiling_app_page_template';

export function CheckSetup({ children }: { children: React.ReactElement }) {
  const {
    start: { core },
    services: { fetchHasSetup, postSetupResources },
  } = useProfilingDependencies();

  const [postSetupLoading, setPostSetupLoading] = useState(false);

  const { status, data, refresh } = useAsync(
    ({ http }) => {
      return fetchHasSetup({ http });
    },
    [fetchHasSetup]
  );

  const http = useAutoAbortedHttpClient([]);

  const displayNoDataScreen = status === AsyncStatus.Settled && data?.has_setup !== true;

  const displayUi = data?.has_setup === true;

  const docsLink = core.docLinks.links.observability.guide;

  const noDataConfig: NoDataPageProps | undefined = displayNoDataScreen
    ? {
        docsLink,
        logo: 'logoObservability',
        action: {
          elasticAgent: {
            title: i18n.translate('xpack.apm.profiling.noDataConfig.action.title', {
              defaultMessage:
                '[Placeholder] Use APM agents to collect APM data. We make it easy with agents for many popular languages.',
            }),
            onClick: (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
              event.preventDefault();
            },
            button: (
              <EuiButton
                disabled={postSetupLoading}
                onClick={(event) => {
                  event.preventDefault();

                  setPostSetupLoading(true);

                  postSetupResources({ http })
                    .then(() => refresh())
                    .finally(() => {
                      setPostSetupLoading(false);
                    });
                }}
                fill
                isLoading={postSetupLoading}
              >
                {!postSetupLoading
                  ? i18n.translate('xpack.apm.profiling.noDataConfig.action.buttonLabel', {
                      defaultMessage: 'Setup Universal Profiling',
                    })
                  : i18n.translate('xpack.apm.profiling.noDataConfig.action.buttonLoadingLabel', {
                      defaultMessage: 'Setting up Universal Profiling...',
                    })}
              </EuiButton>
            ),
          },
        },
        solution: i18n.translate('xpack.profiling.noDataConfig.solutionName', {
          defaultMessage: 'Profiling',
        }),
      }
    : undefined;

  return displayUi ? (
    children
  ) : (
    <ProfilingAppPageTemplate tabs={[]} noDataConfig={noDataConfig} hideSearchBar>
      <></>
    </ProfilingAppPageTemplate>
  );
}
