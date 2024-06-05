/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { Route, Routes } from '@kbn/shared-ux-router';
import { useLocation, useSearchParams } from 'react-router-dom-v5-compat';
import {
  EuiAccordion,
  EuiButton,
  EuiCodeBlock,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { generateCustomLogsYml } from '../../common/elastic_agent_logs';
import backgroundImageUrl from './header/background.svg';
import { Footer } from './footer/footer';
import { OnboardingFlowForm } from './onboarding_flow_form/onboarding_flow_form';
import { Header } from './header/header';
import { SystemLogsPanel } from './quickstart_flows/system_logs';
import { CustomLogsPanel } from './quickstart_flows/custom_logs';
import { BackButton } from './shared/back_button';

const queryClient = new QueryClient();

export function ObservabilityOnboardingFlow() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const DetectionsPanel = () => {
    const { services } = useKibana();
    const [searchParams, setSearchParams] = useSearchParams();
    const host = searchParams.get('host');

    const [{ value: detections }, fetchDetections] = useAsyncFn(async () => {
      // This is a test
      return await services.http!.post('/api/observability/detections', {
        body: JSON.stringify({ hostName: host }),
      });
    }, []);

    useEffect(() => {
      fetchDetections();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const [elasticAgentYml, setElasticAgentYml] = React.useState('');

    console.log(detections);
    const detectionsByPackage =
      detections &&
      Object.fromEntries(detections.results?.map((d) => [d.detection.package, d.detection]));
    console.log(detectionsByPackage);
    return (
      <EuiPanel hasBorder>
        <EuiTitle size="s">
          <strong>
            {i18n.translate(
              'xpack.observability_onboarding.detectionsPanel.h1.observabilityGapsForHostLabel',
              { defaultMessage: 'Observability gaps for host ' }
            )}
            {searchParams.get('host')}
          </strong>
        </EuiTitle>
        <br />
        <br />
        {detectionsByPackage &&
          Object.values(detectionsByPackage).map((detection) => (
            <EuiAccordion
              id={'detection_' + detection.package}
              buttonContent={`${detection.package} (${detection.paths.length} files)`}
            >
              {i18n.translate(
                'xpack.observability_onboarding.detectionsPanel.filesAccordionLabel',
                { defaultMessage: 'Files:' }
              )}
              <ul>
                {detection.paths.map((path) => (
                  <li key={path}>{path}</li>
                ))}
              </ul>
              {detection.package !== 'custom' ? (
                <EuiButton
                  data-test-subj="observabilityOnboardingDetectionsPanelGoToIntegrationButton"
                  onClick={() => {
                    window.open(`/app/integrations/detail/${detection.package}`, '_blank');
                  }}
                >
                  {i18n.translate(
                    'xpack.observability_onboarding.detectionsPanel.goToIntegrationButtonLabel',
                    { defaultMessage: 'Go to integration' }
                  )}
                </EuiButton>
              ) : (
                <EuiButton
                  data-test-subj="observabilityOnboardingDetectionsPanelGoToIntegrationButton"
                  onClick={() => {
                    setElasticAgentYml(
                      generateCustomLogsYml({
                        datasetName: 'logs',
                        namespace: 'default',
                        logFilePaths: detection.paths,
                        apiKey: '$API_KEY',
                        esHost: ['http://localhost:9200'],
                        logfileId: 'my-logs-id',
                      })
                    );
                  }}
                >
                  {i18n.translate(
                    'xpack.observability_onboarding.detectionsPanel.generateElasticAgentYmlButtonLabel',
                    { defaultMessage: 'Generate elastic-agent.yml' }
                  )}
                </EuiButton>
              )}
              {elasticAgentYml && detection.package === 'custom' && (
                <EuiCodeBlock isCopyable>{elasticAgentYml}</EuiCodeBlock>
              )}
            </EuiAccordion>
          ))}
      </EuiPanel>
    );
  };

  return (
    <QueryClientProvider client={queryClient}>
      <EuiPageTemplate.Section
        paddingSize="xl"
        css={css`
          & > div {
            background-image: url(${backgroundImageUrl});
            background-position: right center;
            background-repeat: no-repeat;
          }
        `}
        grow={false}
        restrictWidth
      >
        <EuiSpacer size="xl" />
        <Header />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section paddingSize="xl" color="subdued" restrictWidth>
        <Routes>
          <Route path="/systemLogs">
            <BackButton />
            <SystemLogsPanel />
          </Route>
          <Route path="/customLogs">
            <BackButton />
            <CustomLogsPanel />
          </Route>
          <Route path="/detections">
            <DetectionsPanel />
          </Route>
          <Route>
            <OnboardingFlowForm />
          </Route>
        </Routes>
        <EuiSpacer size="xl" />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section paddingSize="xl" grow={false} restrictWidth>
        <Footer />
        <EuiSpacer size="xl" />
      </EuiPageTemplate.Section>
    </QueryClientProvider>
  );
}
