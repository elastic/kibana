/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import {
  EuiAccordion,
  EuiAccordionProps,
  EuiSpacer,
  EuiText,
  EuiLink,
  EuiCode,
} from '@elastic/eui';

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
  connectorVersion: string;
}
export const DockerInstructionsStep: React.FC<DockerInstructionsStepProps> = ({
  connectorId,
  isWaitingForConnector,
  serviceType,
  apiKeyData,
  connectorVersion,
}) => {
  const [isOpen, setIsOpen] = React.useState<EuiAccordionProps['forceState']>('open');
  const { elasticsearchUrl } = useCloudDetails();

  useEffect(() => {
    if (!isWaitingForConnector) {
      setIsOpen('closed');
    }
  }, [isWaitingForConnector]);

  const configYamlContent = getConnectorTemplate({
    apiKeyData,
    connectorData: { id: connectorId, service_type: serviceType },
    host: elasticsearchUrl,
  });

  const escapedConfigYamlContent = configYamlContent.replace(/"/g, '\\"').replace(/\$/g, '\\$');

  const createConfigCommand = `mkdir -p "$HOME/elastic-connectors" && echo "${escapedConfigYamlContent}" > "$HOME/elastic-connectors/config.yml"`;

  return (
    <>
      <EuiAccordion
        id="collapsibleDocker"
        onToggle={() => setIsOpen(isOpen === 'closed' ? 'open' : 'closed')}
        forceState={isOpen}
        buttonContent={
          <EuiText size="s">
            <h4>
              {i18n.translate(
                'xpack.enterpriseSearch.connectorDeployment.dockerInstructionsHeading',
                {
                  defaultMessage: 'Docker instructions',
                }
              )}
            </h4>
          </EuiText>
        }
      >
        <EuiSpacer />
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.enterpriseSearch.connectorDeployment.p.dockerInstallationNote', {
              defaultMessage: 'Make sure you have Docker installed on your machine.',
            })}
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiText size="s">
          <h5>
            {i18n.translate('xpack.enterpriseSearch.connectorDeployment.p.createConfigFileLabel', {
              defaultMessage: 'Create configuration file',
            })}
          </h5>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.connectorDeployment.p.createConfigFileInstructions',
              {
                defaultMessage:
                  'You need a configuration file with your Elasticsearch and connector details. In your terminal, run the following command to create the config.yml file:',
              }
            )}
          </p>
        </EuiText>
        <EuiSpacer />
        <CodeBox showTopBar={false} languageType="bash" codeSnippet={createConfigCommand} />
        <EuiSpacer />
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.connectorDeployment.p.configFileExplanation"
              defaultMessage="This command creates a {configFile} file in the {directory} directory with your specific connector and Elasticsearch details."
              values={{
                configFile: <EuiCode>config.yml</EuiCode>,
                directory: <EuiCode>$HOME/elastic-connectors</EuiCode>,
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.connectorDeployment.p.exampleConfigFile"
              defaultMessage="If you want to customize settings later, refer to this {exampleConfigLink}."
              values={{
                exampleConfigLink: (
                  <EuiLink
                    data-test-subj="enterpriseSearchDockerInstructionsStepExampleConfigFileLink"
                    href="https://github.com/elastic/connectors/blob/main/config.yml.example"
                    target="_blank"
                    external
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.connectorDeployment.exampleConfigLinkText',
                      {
                        defaultMessage: 'example config file',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiText size="s">
          <h5>
            {i18n.translate('xpack.enterpriseSearch.connectorDeployment.p.runContainerLabel', {
              defaultMessage: 'Run container',
            })}
          </h5>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.connectorDeployment.p.runTheFollowingCommandLabel',
              {
                defaultMessage: 'Run the following command to start the container:',
              }
            )}
          </p>
        </EuiText>
        <EuiSpacer />
        <CodeBox
          showTopBar={false}
          languageType="bash"
          codeSnippet={getRunFromDockerSnippet({
            version: connectorVersion,
          })}
        />
      </EuiAccordion>
    </>
  );
};
