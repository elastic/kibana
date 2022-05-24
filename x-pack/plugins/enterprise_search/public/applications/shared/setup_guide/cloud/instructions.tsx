/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPageContent, EuiSteps, EuiText, EuiLink, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../doc_links';

interface Props {
  productName: string;
  cloudDeploymentLink?: string;
}

export const CloudSetupInstructions: React.FC<Props> = ({ productName, cloudDeploymentLink }) => (
  <EuiPageContent>
    <EuiSteps
      headingElement="h2"
      steps={[
        {
          title: i18n.translate('xpack.enterpriseSearch.setupGuide.cloud.step1.title', {
            defaultMessage: 'Edit your deployment’s configuration',
          }),
          children: (
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.setupGuide.cloud.step1.instruction1"
                  defaultMessage="Visit the Elastic Cloud console to {editDeploymentLink}."
                  values={{
                    editDeploymentLink: cloudDeploymentLink ? (
                      <EuiLink href={cloudDeploymentLink + '/edit'} target="_blank">
                        {i18n.translate(
                          'xpack.enterpriseSearch.setupGuide.cloud.step1.instruction1LinkText',
                          { defaultMessage: 'edit your deployment' }
                        )}
                      </EuiLink>
                    ) : (
                      i18n.translate(
                        'xpack.enterpriseSearch.setupGuide.cloud.step1.instruction1LinkText',
                        { defaultMessage: 'edit your deployment' }
                      )
                    ),
                  }}
                />
              </p>
            </EuiText>
          ),
        },
        {
          title: i18n.translate('xpack.enterpriseSearch.setupGuide.cloud.step2.title', {
            defaultMessage: 'Enable Enterprise Search for your deployment',
          }),
          children: (
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.setupGuide.cloud.step2.instruction1"
                  defaultMessage="Once you're within your deployment's “Edit deployment” screen, scroll to the Enterprise Search configuration and select “Enable”."
                />
              </p>
            </EuiText>
          ),
        },
        {
          title: i18n.translate('xpack.enterpriseSearch.setupGuide.cloud.step3.title', {
            defaultMessage: 'Configure your Enterprise Search instance',
          }),
          children: (
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.setupGuide.cloud.step3.instruction1"
                  defaultMessage="After enabling Enterprise Search for your instance you can customize the instance, including fault tolerance, RAM, and other {optionsLink}."
                  values={{
                    optionsLink: (
                      <EuiLink href={docLinks.enterpriseSearchConfig} target="_blank">
                        {i18n.translate(
                          'xpack.enterpriseSearch.setupGuide.cloud.step3.instruction1LinkText',
                          { defaultMessage: 'configurable options' }
                        )}
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiText>
          ),
        },
        {
          title: i18n.translate('xpack.enterpriseSearch.setupGuide.cloud.step4.title', {
            defaultMessage: 'Save your deployment configuration',
          }),
          children: (
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.setupGuide.cloud.step4.instruction1"
                  defaultMessage="Once you click “Save”, you'll see a confirmation dialog summarizing the changes being made to your deployment. Once you confirm, your deployment will process the configuration change, which should only take a few moments."
                />
              </p>
            </EuiText>
          ),
        },
        {
          title: i18n.translate('xpack.enterpriseSearch.setupGuide.cloud.step5.title', {
            defaultMessage: '{productName} is now available to use',
            values: { productName },
          }),
          children: (
            <EuiCallOut>
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.setupGuide.cloud.step5.instruction1"
                  defaultMessage="For {productName} indices that contain time-series statistical data, you may want to {configurePolicyLink}, so as to ensure optimal performance and cost-effective storage in the long run."
                  values={{
                    productName,
                    configurePolicyLink: (
                      <EuiLink href={docLinks.cloudIndexManagement} target="_blank">
                        {i18n.translate(
                          'xpack.enterpriseSearch.setupGuide.cloud.step5.instruction1LinkText',
                          { defaultMessage: 'configure an index lifecycle policy' }
                        )}
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiCallOut>
          ),
        },
        {
          title: i18n.translate('xpack.enterpriseSearch.setupGuide.cloud.step6.title', {
            defaultMessage: 'Troubleshooting issues',
          }),
          children: (
            <>
              <EuiText>
                <p>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.setupGuide.cloud.step6.instruction1"
                    defaultMessage="For help with common setup issues, read our {link} guide."
                    values={{
                      link: (
                        <EuiLink
                          href={docLinks.enterpriseSearchTroubleshootSetup}
                          target="_blank"
                          external
                        >
                          {i18n.translate(
                            'xpack.enterpriseSearch.setupGuide.cloud.step6.instruction1LinkText',
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
