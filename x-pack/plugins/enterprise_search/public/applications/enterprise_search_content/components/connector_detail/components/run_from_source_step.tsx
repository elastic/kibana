/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import dedent from 'dedent';

import {
  EuiAccordion,
  EuiAccordionProps,
  EuiButton,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeBox } from '@kbn/search-api-panels';

import { useCloudDetails } from '../../../../shared/cloud_details/cloud_details';

import { ApiKey } from '../../../api/connector/generate_connector_api_key_api_logic';
import { getConnectorTemplate } from '../../search_index/connector/constants';

export interface RunFromSourceStepProps {
  apiKeyData?: ApiKey;
  connectorId?: string;
  isWaitingForConnector: boolean;
  serviceType: string;
}

export const RunFromSourceStep: React.FC<RunFromSourceStepProps> = ({
  apiKeyData,
  connectorId,
  isWaitingForConnector,
  serviceType,
}) => {
  const [isOpen, setIsOpen] = React.useState<EuiAccordionProps['forceState']>('open');
  useEffect(() => {
    if (!isWaitingForConnector) {
      setIsOpen('closed');
    }
  }, [isWaitingForConnector]);

  const { elasticsearchUrl } = useCloudDetails();

  return (
    <>
      <EuiText size="m">
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.connectorDeployment.p.addTheFollowingConfigurationLabel',
            {
              defaultMessage: 'Clone or download the repo to your local machine',
            }
          )}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCode>git clone https://github.com/elastic/connectors</EuiCode>&nbsp;&nbsp;&nbsp;
      {i18n.translate('xpack.enterpriseSearch.connectorDeployment.orLabel', {
        defaultMessage: 'or',
      })}
      &nbsp;&nbsp;&nbsp;
      <EuiButton
        data-test-subj="enterpriseSearchConnectorDeploymentGoToSourceButton"
        iconType="logoGithub"
        href="https://github.com/elastic/connectors"
        target="_blank"
      >
        <EuiFlexGroup responsive={false} gutterSize="xs">
          <EuiFlexItem>
            {i18n.translate('xpack.enterpriseSearch.connectorDeployment.goToSourceButtonLabel', {
              defaultMessage: 'Go to Source',
            })}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon type="popout" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiButton>
      <EuiSpacer size="s" />
      <EuiAccordion
        id="collapsibleAccordion"
        onToggle={() => setIsOpen(isOpen === 'closed' ? 'open' : 'closed')}
        forceState={isOpen}
        buttonContent={
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.connectorDeployment.p.editConfigLabel"
                defaultMessage="Edit the {configYaml} file and provide the following configuration"
                values={{
                  configYaml: (
                    <EuiCode>
                      {i18n.translate(
                        'xpack.enterpriseSearch.connectorDeployment.configYamlCodeBlockLabel',
                        { defaultMessage: 'config.yml' }
                      )}
                    </EuiCode>
                  ),
                }}
              />
            </p>
          </EuiText>
        }
      >
        <EuiSpacer size="s" />
        <CodeBox
          showTopBar={false}
          languageType="yaml"
          codeSnippet={getConnectorTemplate({
            apiKeyData,
            connectorData: {
              id: connectorId ?? '',
              service_type: serviceType,
            },
            host: elasticsearchUrl,
          })}
        />
        <EuiSpacer />
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.enterpriseSearch.connectorDeployment.p.compileAndRunLabel', {
              defaultMessage: 'Compile and run',
            })}
          </p>
        </EuiText>
        <EuiSpacer />
        <CodeBox
          showTopBar={false}
          languageType="bash"
          codeSnippet={dedent`
                              make install
                              make run
                              `}
        />
      </EuiAccordion>
    </>
  );
};
