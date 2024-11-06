/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const FeedbackForm = () => {
  return (
    <>
      <EuiFlexItem>
        <EuiText textAlign="center" color="subdued">
          <p>
            {i18n.translate('xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.subDescription', {
              defaultMessage:
                'We value your feedback! Please share your ideas and suggestions as we develop this new feature.',
            })}
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiForm component="form" fullWidth>
        <EuiFormRow
          label={i18n.translate(
            'xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.additionalFeedback.Label',
            {
              defaultMessage:
                'Would you like to share any ideas or suggestions about Elastic managed web crawlers?',
            }
          )}
        >
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiTextArea
                data-test-subj="serverlessSearchElasticManagedWebCrawlerCommingSoonTextArea"
                onChange={(e) => {
                  // setAdditionalFeedback(e.target.value);
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="subdued" size="xs">
                <FormattedMessage
                  id="xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.additionalFeedback.description"
                  defaultMessage=" By submitting feedback you acknowledge that you've read and agree to our {termsOfService}, and that Elastic may {contact} about our related products and services,
                      using the details you provide above. See {privacyStatementLink} for more
                      details or to opt-out at any time."
                  values={{
                    contact: (
                      <EuiLink
                        data-test-subj="serverlessSearchElasticManagedWebCrawlerCommingSoonContactYouLink"
                        href={'docLinks.workplaceSearchGatedFormDataUse'}
                      >
                        <FormattedMessage
                          id="xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.additionalFeedback.contact"
                          defaultMessage="contact you"
                        />
                      </EuiLink>
                    ),
                    privacyStatementLink: (
                      <EuiLink
                        data-test-subj="serverlessSearchElasticManagedWebCrawlerCommingSoonElasticsPrivacyStatementLink"
                        href={'docLinks.workplaceSearchGatedFormPrivacyStatement'}
                      >
                        <FormattedMessage
                          id="xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.additionalFeedback.readDataPrivacyStatementLink"
                          defaultMessage="Elastic’s Privacy Statement"
                        />
                      </EuiLink>
                    ),
                    termsOfService: (
                      <EuiLink
                        data-test-subj="serverlessSearchElasticManagedWebCrawlerCommingSoonTermsOfServiceLink"
                        href={'docLinks.workplaceSearchGatedFormTermsOfService'}
                      >
                        <FormattedMessage
                          id="xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.additionalFeedback.readTermsOfService"
                          defaultMessage="Terms of Service"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiForm>
      <EuiFlexGroup direction="row" gutterSize="m">
        <EuiFlexItem>
          <EuiButton
            data-test-subj="serverlessSearchElasticManagedWebCrawlerEmptysubmitFormButton"
            fill
            type="submit"
            // onClick={() => ()}
          >
            {i18n.translate(
              'xpack.serverlessSearch.elasticManagedWebCrawlerEmpty.submitFormButton',
              {
                defaultMessage: 'Submit',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
