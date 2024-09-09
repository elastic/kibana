/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { EuiAccordion, EuiAccordionProps, EuiCode, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeBox } from '@kbn/search-api-panels';

import { useCloudDetails } from '../../../../shared/cloud_details/cloud_details';

import { ApiKey } from '../../../api/connector/generate_connector_api_key_api_logic';
import {
  getConnectorTemplate,
  getRunFromDockerSnippet,
} from '../../search_index/connector/constants';

export interface DockerInstructionsStepProps {
  apiKeyData?: ApiKey;
  connectorId: string;
  hasApiKey: boolean;
  isWaitingForConnector: boolean;
  serviceType: string;
}
export const DockerInstructionsStep: React.FC<DockerInstructionsStepProps> = ({
  connectorId,
  isWaitingForConnector,
  serviceType,
  apiKeyData,
}) => {
  const [isOpen, setIsOpen] = React.useState<EuiAccordionProps['forceState']>('open');
  const { elasticsearchUrl } = useCloudDetails();

  useEffect(() => {
    if (!isWaitingForConnector) {
      setIsOpen('closed');
    }
  }, [isWaitingForConnector]);

  return (
    <>
      <EuiAccordion
        id="collapsibleDocker"
        onToggle={() => setIsOpen(isOpen === 'closed' ? 'open' : 'closed')}
        forceState={isOpen}
        buttonContent={
          <EuiText size="s">
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.connectorDeployment.p.downloadConfigurationLabel',
                {
                  defaultMessage:
                    'You can either download the configuration file manually or run the following command',
                }
              )}
            </p>
          </EuiText>
        }
      >
        <EuiSpacer />
        <CodeBox
          showTopBar={false}
          languageType="bash"
          codeSnippet={
            'curl https://raw.githubusercontent.com/elastic/connectors/main/config.yml.example --output </absolute/path/to>/connectors'
          }
        />
        <EuiSpacer />
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.connectorDeployment.p.changeOutputPathLabel"
              defaultMessage="Change the {output} argument value to the path where you want to save the configuration file."
              values={{
                output: <EuiCode>--output</EuiCode>,
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <FormattedMessage
          id="xpack.enterpriseSearch.connectorDeployment.p.editConfigYamlLabel"
          defaultMessage="Edit the {configYaml} file and provide the next credentials"
          values={{
            configYaml: <EuiCode>config.yml</EuiCode>,
          }}
        />
        <EuiSpacer />
        <CodeBox
          showTopBar={false}
          languageType="yaml"
          codeSnippet={getConnectorTemplate({
            apiKeyData,
            connectorData: {
              id: connectorId ?? '',
              service_type: serviceType ?? '',
            },
            host: elasticsearchUrl,
          })}
        />
        <EuiSpacer />
        <EuiText size="m">
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.connectorDeployment.p.runTheFollowingCommandLabel',
              {
                defaultMessage:
                  'Run the following command in your terminal. Make sure you have Docker installed on your machine',
              }
            )}
          </p>
        </EuiText>
        <EuiSpacer />
        <CodeBox
          showTopBar={false}
          languageType="bash"
          codeSnippet={getRunFromDockerSnippet({
            version: '8.15.0',
          })}
        />
      </EuiAccordion>
    </>
  );
};
