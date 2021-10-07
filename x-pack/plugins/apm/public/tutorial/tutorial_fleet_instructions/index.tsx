/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiPanel } from '@elastic/eui';
import { EuiCard } from '@elastic/eui';
import { EuiImage } from '@elastic/eui';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HttpStart } from 'kibana/public';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { APIReturnType } from '../../services/rest/createCallApmApi';

interface Props {
  http: HttpStart;
  basePath: string;
  isDarkTheme: boolean;
}

const CentralizedContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

type APIResponseType = APIReturnType<'GET /api/apm/fleet/has_data'>;

function TutorialFleetInstructions({ http, basePath, isDarkTheme }: Props) {
  const [data, setData] = useState<APIResponseType | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await http.get('/api/apm/fleet/has_data');
        setData(response as APIResponseType);
      } catch (e) {
        setIsLoading(false);
        console.error('Error while fetching fleet details.', e);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [http]);

  if (isLoading) {
    return (
      <CentralizedContainer>
        <EuiLoadingSpinner />
      </CentralizedContainer>
    );
  }

  // When APM integration is enable in Fleet
  if (data?.hasData) {
    return (
      <EuiButton iconType="gear" fill href={`${basePath}/app/fleet#/policies`}>
        {i18n.translate(
          'xpack.apm.tutorial.apmServer.fleet.manageApmIntegration.button',
          {
            defaultMessage: 'Manage APM integration in Fleet',
          }
        )}
      </EuiButton>
    );
  }
  // When APM integration is not installed in Fleet or for some reason the API didn't work out
  return (
    <EuiPanel>
      <EuiFlexGroup>
        <EuiFlexItem grow={7}>
          <EuiCard
            display="plain"
            textAlign="left"
            title={i18n.translate('xpack.apm.tutorial.apmServer.fleet.title', {
              defaultMessage: 'Elastic APM now available in Fleet!',
            })}
            description={i18n.translate(
              'xpack.apm.tutorial.apmServer.fleet.message',
              {
                defaultMessage:
                  'The APM integration installs Elasticsearch templates and ingest pipelines for APM data.',
              }
            )}
            footer={
              <EuiButton
                iconType="analyzeEvent"
                color="secondary"
                href={`${basePath}/app/integrations#/detail/apm-0.4.0/overview`}
              >
                {i18n.translate(
                  'xpack.apm.tutorial.apmServer.fleet.apmIntegration.button',
                  {
                    defaultMessage: 'APM integration',
                  }
                )}
              </EuiButton>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <EuiImage
            src={`${basePath}/plugins/kibanaReact/assets/${
              isDarkTheme
                ? 'illustration_integrations_darkmode.svg'
                : 'illustration_integrations_lightmode.svg'
            }`}
            alt="Illustration"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
// eslint-disable-next-line import/no-default-export
export default TutorialFleetInstructions;
