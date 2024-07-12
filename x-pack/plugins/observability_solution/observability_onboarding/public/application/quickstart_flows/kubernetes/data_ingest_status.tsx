/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  StepsProgress,
  useFlowProgressTelemetry,
} from '../../../hooks/use_flow_progress_telemetry';
import { ObservabilityOnboardingContextValue } from '../../../plugin';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { ProgressIndicator } from '../shared/progress_indicator';

interface Props {
  onboardingId: string;
}

const FETCH_INTERVAL = 2000;
const SHOW_TROUBLESHOOTING_DELAY = 120000; // 2 minutes
const CLUSTER_OVERVIEW_DASHBOARD_ID = 'kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c';

export function DataIngestStatus({ onboardingId }: Props) {
  const {
    services: { share, http },
  } = useKibana<ObservabilityOnboardingContextValue>();
  const [progress, setProgress] = useState<StepsProgress | undefined>(undefined);
  const [checkDataStartTime] = useState(Date.now());

  const dashboardLocator = share.url.locators.get(DASHBOARD_APP_LOCATOR);

  const { data, status, refetch } = useFetcher(
    (callApi) => {
      return callApi('GET /internal/observability_onboarding/kubernetes/{onboardingId}/has-data', {
        params: { path: { onboardingId } },
      });
    },
    [onboardingId]
  );

  useEffect(() => {
    const pendingStatusList = [FETCH_STATUS.LOADING, FETCH_STATUS.NOT_INITIATED];

    if (pendingStatusList.includes(status) || data?.hasData === true) {
      return;
    }

    const timeout = setTimeout(() => {
      refetch();
    }, FETCH_INTERVAL);

    return () => clearTimeout(timeout);
  }, [data?.hasData, refetch, status]);

  useEffect(() => {
    if (data?.hasData === true) {
      setProgress({ 'logs-ingest': { status: 'complete' } });
    }
  }, [data?.hasData]);

  useFlowProgressTelemetry(progress, onboardingId);

  const isTroubleshootingVisible =
    data?.hasData === false && Date.now() - checkDataStartTime > SHOW_TROUBLESHOOTING_DELAY;

  return (
    <>
      <ProgressIndicator
        title={data?.hasData ? 'We are monitoring your cluster' : 'Waiting for data to be shipped'}
        iconType="checkInCircleFilled"
        isLoading={!data?.hasData}
        css={css`
          max-width: 40%;
        `}
      />

      {isTroubleshootingVisible && (
        <>
          <EuiSpacer />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.observability_onboarding.dataIngestStatus.troubleshootingTextLabel"
              defaultMessage="Find more details and troubleshooting solutions in our documentation. {troubleshootingLink}"
              values={{
                troubleshootingLink: (
                  <EuiLink
                    data-test-subj="observabilityOnboardingDataIngestStatusTroubleshootingLink"
                    href="https://www.elastic.co/guide/en/fleet/current/fleet-troubleshooting.html#agent-oom-k8s"
                    external
                    target="_blank"
                  >
                    {i18n.translate(
                      'xpack.observability_onboarding.dataIngestStatus.troubleshootingLinkText',
                      {
                        defaultMessage: 'Open documentation',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </>
      )}

      {data?.hasData === true && (
        <>
          <EuiSpacer />

          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiImage
                src={http.staticAssets.getPluginAssetHref('waterfall_screen.svg')}
                width={162}
                height={117}
                alt=""
                hasShadow
              />
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiText>
                <p>
                  {i18n.translate(
                    'xpack.observability_onboarding.kubernetesPanel.monitoringCluster',
                    {
                      defaultMessage:
                        'Overview your Kubernetes cluster with this pre-made dashboard',
                    }
                  )}
                </p>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiLink
                data-test-subj="observabilityOnboardingDataIngestStatusViewDashboardLink"
                href={dashboardLocator?.getRedirectUrl({
                  dashboardId: CLUSTER_OVERVIEW_DASHBOARD_ID,
                })}
              >
                {i18n.translate('xpack.observability_onboarding.kubernetesPanel.exploreDashboard', {
                  defaultMessage: 'Explore Kubernetes cluster',
                })}
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer />

          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.observability_onboarding.dataIngestStatus.findAllPremadeAssetsTextLabel"
              defaultMessage="Find all pre-made assets ready to use {viewAllAssetsLink}"
              values={{
                viewAllAssetsLink: (
                  <EuiLink
                    data-test-subj="observabilityOnboardingDataIngestStatusViewAllAssetsLink"
                    href={`${http.basePath.get()}/app/integrations/detail/kubernetes/assets`}
                  >
                    {i18n.translate(
                      'xpack.observability_onboarding.dataIngestStatus.viewAllAssetsLinkText',
                      {
                        defaultMessage: 'View all assets',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </>
      )}
    </>
  );
}
