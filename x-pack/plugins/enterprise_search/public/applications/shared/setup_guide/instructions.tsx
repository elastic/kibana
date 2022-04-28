/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiPageContent,
  EuiText,
  EuiSteps,
  EuiCode,
  EuiCodeBlock,
  EuiAccordion,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../doc_links';

interface Props {
  productName: string;
}

export const SetupInstructions: React.FC<Props> = ({ productName }) => (
  <EuiPageContent>
    <EuiSteps
      headingElement="h2"
      steps={[
        {
          title: i18n.translate('xpack.enterpriseSearch.setupGuide.step1.title', {
            defaultMessage: 'Add your {productName} host URL to your Kibana configuration',
            values: { productName },
          }),
          children: (
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.setupGuide.step1.instruction1"
                  defaultMessage="In your {configFile} file, set {configSetting} to the URL of your {productName} instance. For example:"
                  values={{
                    productName,
                    configFile: <EuiCode>config/kibana.yml</EuiCode>,
                    configSetting: <EuiCode>enterpriseSearch.host</EuiCode>,
                  }}
                />
              </p>
              <EuiCodeBlock language="yml">
                enterpriseSearch.host: &apos;http://localhost:3002&apos;
              </EuiCodeBlock>
            </EuiText>
          ),
        },
        {
          title: i18n.translate('xpack.enterpriseSearch.setupGuide.step2.title', {
            defaultMessage: 'Reload your Kibana instance',
          }),
          children: (
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.setupGuide.step2.instruction1"
                  defaultMessage="Restart Kibana to pick up the configuration changes from the previous step."
                />
              </p>
            </EuiText>
          ),
        },
        {
          title: i18n.translate('xpack.enterpriseSearch.setupGuide.step3.title', {
            defaultMessage: 'Troubleshooting issues',
          }),
          children: (
            <>
              <EuiAccordion
                buttonContent={i18n.translate(
                  'xpack.enterpriseSearch.troubleshooting.differentEsClusters.title',
                  {
                    defaultMessage:
                      '{productName} and Kibana are on different Elasticsearch clusters',
                    values: { productName },
                  }
                )}
                id="differentEsClusters"
                paddingSize="s"
              >
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.troubleshooting.differentEsClusters.description"
                      defaultMessage="This plugin does not currently support {productName} and Kibana running on different clusters."
                      values={{ productName }}
                    />
                  </p>
                </EuiText>
              </EuiAccordion>
              <EuiSpacer />
              <EuiText>
                <p>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.troubleshooting.setup.description"
                    defaultMessage="For help with other common setup issues, read our {link} guide."
                    values={{
                      link: (
                        <EuiLink
                          href={docLinks.enterpriseSearchTroubleshootSetup}
                          target="_blank"
                          external
                        >
                          {i18n.translate(
                            'xpack.enterpriseSearch.troubleshooting.setup.documentationLinkLabel',
                            { defaultMessage: 'Troubleshoot Enterprise Search setup' }
                          )}
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiText>
            </>
          ),
        },
      ]}
    />
  </EuiPageContent>
);
