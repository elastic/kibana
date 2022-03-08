/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPanel,
  EuiCard,
  EuiImage,
  EuiLoadingSpinner,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HttpStart } from 'kibana/public';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  isPrereleaseVersion,
  SUPPORTED_APM_PACKAGE_VERSION,
} from '../../../common/fleet';
import { APIReturnType } from '../../services/rest/create_call_apm_api';

interface Props {
  http: HttpStart;
  basePath: string;
  isDarkTheme: boolean;
  kibanaVersion: string;
}

const CentralizedContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

type APIResponseType = APIReturnType<'GET /internal/apm/fleet/migration_check'>;

function TutorialFleetInstructions({
  http,
  basePath,
  isDarkTheme,
  kibanaVersion,
}: Props) {
  const [data, setData] = useState<APIResponseType | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await http.get('/internal/apm/fleet/migration_check');
        setData(response as APIResponseType);
      } catch (e) {
        setIsLoading(false);
        console.error('Error while fetching fleet details.', e);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [http]);

  const hasApmIntegrations = !!data?.has_apm_integrations;
  const cloudApmMigrationEnabled = !!data?.cloud_apm_migration_enabled;
  const hasCloudAgentPolicy = !!data?.has_cloud_agent_policy;
  const cloudApmPackagePolicy = data?.cloud_apm_package_policy;
  const hasCloudApmPackagePolicy = !!cloudApmPackagePolicy;
  const hasRequiredRole = !!data?.has_required_role;
  const shouldLinkToMigration =
    cloudApmMigrationEnabled &&
    hasCloudAgentPolicy &&
    !hasCloudApmPackagePolicy &&
    hasRequiredRole;

  const apmIntegrationHref = shouldLinkToMigration
    ? `${basePath}/app/apm/settings/schema`
    : isPrereleaseVersion(kibanaVersion)
    ? `${basePath}/app/integrations#/detail/apm/overview`
    : `${basePath}/app/integrations/detail/apm-${SUPPORTED_APM_PACKAGE_VERSION}/overview`;

  if (isLoading) {
    return (
      <CentralizedContainer>
        <EuiLoadingSpinner />
      </CentralizedContainer>
    );
  }

  // When APM integration is enable in Fleet
  if (hasApmIntegrations) {
    return (
      <EuiButton
        iconType="gear"
        fill
        href={`${basePath}/app/integrations/detail/apm-${SUPPORTED_APM_PACKAGE_VERSION}/policies`}
      >
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
              <>
                <EuiButton
                  iconType="analyzeEvent"
                  color="success"
                  href={apmIntegrationHref}
                >
                  {i18n.translate(
                    'xpack.apm.tutorial.apmServer.fleet.apmIntegration.button',
                    {
                      defaultMessage: 'APM integration',
                    }
                  )}
                </EuiButton>
                <EuiSpacer size="m" />
                <EuiText size="s">
                  <p>
                    {i18n.translate(
                      'xpack.apm.tutorial.apmServer.fleet.apmIntegration.description',
                      {
                        defaultMessage:
                          'Fleet allows you to centrally manage Elastic Agents running the APM integration. The default option is to install a Fleet Server on a dedicated host. For setups without a dedicated host, we recommend following the instructions to install the standalone APM Server for your operating system by selecting the respective tab above.',
                      }
                    )}
                  </p>
                </EuiText>
              </>
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
