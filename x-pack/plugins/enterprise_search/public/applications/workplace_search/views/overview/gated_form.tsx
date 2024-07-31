/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormLabel,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../shared/doc_links';

import { WorkplaceSearchGateLogic } from './gated_form_logic';

const getFeature = (id: string) => {
  switch (id) {
    case featuresList.searchApplication.id:
      return featuresList.searchApplication;
    case featuresList.contentSources.id:
      return featuresList.contentSources;
    case featuresList.contentExtraction.id:
      return featuresList.contentExtraction;
    case featuresList.documentLevelPermissions.id:
      return featuresList.documentLevelPermissions;
    case featuresList.synonyms.id:
      return featuresList.synonyms;
    case featuresList.analytics.id:
      return featuresList.analytics;
  }
};
const featuresList = {
  analytics: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.analytics.action.Label',
      {
        defaultMessage: 'Start with Behavioral Analytics',
      }
    ),
    actionLink: './analytics ',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.analytics.featureDescription',
      {
        defaultMessage:
          "Did you know you can easily analyze your users' searching and clicking behavior with Behavioral Analytics? Instrument your website or application for tracking relevant user actions.",
      }
    ),
    id: 'Analytics',
    learnMore: 'https://www.elastic.co/guide/en/enterprise-search/current/analytics-overview.html',
    title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.gateForm.analytics.featureName', {
      defaultMessage: 'Use Behavioral Analytics',
    }),
  },
  contentExtraction: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.connectorExtraction.featureButtonLabel',
      {
        defaultMessage: 'Use a connector ',
      }
    ),
    actionLink: './content/search_indices/new_index/select_connector',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,

    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.connectorExtraction.featureDescription',
      {
        defaultMessage:
          'Did you know you have access to powerful content extraction via Elastic connectors! Use our powerful and highly adaptable extraction capabilities to extract contents from your files. ',
      }
    ),
    id: 'Content Extraction',
    learnMore: 'https://www.elastic.co/guide/en/enterprise-search/current/connectors.html ',
    title: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.connectorExtraction.featureName',
      {
        defaultMessage: 'Use Elastic connectors',
      }
    ),
  },
  contentSources: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.connectorSources.featureButtonLabel',
      {
        defaultMessage: 'Use a connector ',
      }
    ),
    actionLink: './content/search_indices/new_index/select_connector',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.connectorSources.featureDescription',
      {
        defaultMessage:
          'Did you know Elastic connectors are now available? You can keep content on your data sources in sync with your search-optimized indices! ',
      }
    ),
    id: 'Content sources',
    learnMore: 'https://www.elastic.co/guide/en/enterprise-search/current/connectors.html ',
    title: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.connectorSources.featureName',
      {
        defaultMessage: 'Use Elastic connectors',
      }
    ),
  },
  documentLevelPermissions: {
    actionLabel: undefined,
    actionLink: undefined,
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,

    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.docLevelPermissions.featureDescription',
      {
        defaultMessage:
          'Did you know you can restrict access to documents in your Elasticsearch indices according to user and group permissions? Return only authorized search results for users with Elastic’s document level security. ',
      }
    ),
    id: 'Document Level Permissions',
    learnMore: 'https://www.elastic.co/guide/en/enterprise-search/current/dls.html',
    title: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.docLevelPermissions.featureName',
      {
        defaultMessage: 'Use Elastic connectors',
      }
    ),
  },
  searchApplication: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.searchApplication.action.Label',
      {
        defaultMessage: 'Create a Search Application',
      }
    ),
    actionLink: './applications/search_applications',
    addOnLearnMoreLabel: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.searchApplication.addOn.learnMoreLabel',
      {
        defaultMessage: 'Search UI',
      }
    ),
    addOnLearnMoreUrl: 'https://www.elastic.co/guide/en/enterprise-search/current/search-ui.html  ',
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.searchApplication.featureDescription',
      {
        defaultMessage:
          'Did you know you can restrict access to documents in your Elasticsearch indices according to user and group permissions? Return only authorized search results for users with Elastic’s document level security. ',
      }
    ),
    id: 'Search Application',
    learnMore: 'https://www.elastic.co/guide/en/enterprise-search/current/search-applications.html',
    title: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.searchApplication.featureName',
      {
        defaultMessage: 'Create Search Application',
      }
    ),
  },
  synonyms: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.synonyms.action.Label',
      {
        defaultMessage: 'Search with synonyms',
      }
    ),
    actionLink:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-with-synonyms.html ',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.synonyms.featureDescription',
      {
        defaultMessage:
          'Did you know you can improve your search experience by searching with synonyms? Use our Synonyms API to easily create and manage synonym sets.',
      }
    ),
    id: 'Synonyms',
    learnMore: 'https://www.elastic.co/guide/en/elasticsearch/reference/8.10/synonyms-apis.html',
    title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.gateForm.synonyms.featureName', {
      defaultMessage: 'Search with Synonyms API',
    }),
  },
};

const participateInUXLabsChoice = {
  no: { choice: 'no', value: false },
  yes: { choice: 'yes', value: true },
};

const EducationPanel: React.FC<{ featureContent: string }> = ({ featureContent }) => {
  const feature = getFeature(featureContent);
  const { setFeaturesOther } = useActions(WorkplaceSearchGateLogic);
  if (feature) {
    return (
      <EuiPanel hasShadow={false}>
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoElastic" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem>
                <EuiText>
                  <h5>
                    {i18n.translate(
                      'xpack.enterpriseSearch.workplaceSearch.gateForm.educationalPanel.title',
                      {
                        defaultMessage: 'Elasticsearch native equivalent',
                      }
                    )}
                  </h5>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.workplaceSearch.gateForm.educationalPanel.subTitle',
                      {
                        defaultMessage: 'Based on your selection we recommend you',
                      }
                    )}
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />

        <EuiCallOut title={feature.title} color="success" iconType="checkInCircleFilled">
          <p>{feature.description}</p>
          <EuiFlexGroup gutterSize="m" wrap alignItems="baseline">
            {feature.actionLink !== undefined && feature.actionLabel !== undefined && (
              <EuiFlexItem grow={false}>
                <EuiButton href={feature.actionLink} iconType="sortRight" iconSide="right">
                  {feature.actionLabel}
                </EuiButton>
              </EuiFlexItem>
            )}

            <EuiFlexItem grow={false}>
              <EuiLink href={feature.learnMore} target="_blank">
                {i18n.translate(
                  'xpack.enterpriseSearch.workplaceSearch.gateForm.educationalPanel.learnMore',
                  {
                    defaultMessage: 'Learn More',
                  }
                )}
              </EuiLink>
            </EuiFlexItem>

            {feature.addOnLearnMoreLabel !== undefined &&
              feature.addOnLearnMoreUrl !== undefined && (
                <EuiFlexItem grow={false}>
                  <EuiLink type="button" href={feature.addOnLearnMoreUrl} target="_blank" external>
                    <EuiSpacer />
                    {feature.addOnLearnMoreLabel}
                  </EuiLink>
                </EuiFlexItem>
              )}
          </EuiFlexGroup>
        </EuiCallOut>
      </EuiPanel>
    );
  } else {
    return (
      <>
        <EuiSpacer />
        <EuiFormRow
          label={i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.gateForm.featureOther.Label',
            {
              defaultMessage: "Can you explain what other feature(s) you're looking for?",
            }
          )}
        >
          <EuiTextArea
            onChange={(e) => {
              setFeaturesOther(e.target.value);
            }}
          />
        </EuiFormRow>
      </>
    );
  }
};
export const WorkplaceSearchGate: React.FC = () => {
  const options = [
    {
      dropdownDisplay: (
        <Fragment>
          <strong>
            {i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.contentSource.title',
              {
                defaultMessage: 'Content sources',
              }
            )}
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.contentSource.description',
                {
                  defaultMessage:
                    'Extract the content of synced source files to make them searchable',
                }
              )}
            </p>
          </EuiText>
        </Fragment>
      ),
      inputDisplay: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.contentSource.inputDisplay',
        {
          defaultMessage: 'Content Sources',
        }
      ),
      value: featuresList.contentSources.id,
    },
    {
      dropdownDisplay: (
        <Fragment>
          <strong>
            {i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.contentExtraction.title',
              {
                defaultMessage: 'Content extraction',
              }
            )}
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.contentExtraction.description',
                {
                  defaultMessage:
                    'Extract the content of synced source files to make them searchable',
                }
              )}
            </p>
          </EuiText>
        </Fragment>
      ),
      inputDisplay: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.contentExtraction.inputDisplay',
        {
          defaultMessage: 'Content extraction',
        }
      ),
      value: featuresList.contentExtraction.id,
    },
    {
      dropdownDisplay: (
        <Fragment>
          <strong>
            {i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.docLevelPermissions.title',
              {
                defaultMessage: 'Document-level permissions',
              }
            )}
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.docLevelPermissions.description',
                {
                  defaultMessage: 'Control access to specific documents',
                }
              )}
            </p>
          </EuiText>
        </Fragment>
      ),
      inputDisplay: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.docLevelPermissions.inputDisplay',
        {
          defaultMessage: 'Document-level permissions',
        }
      ),
      value: featuresList.documentLevelPermissions.id,
    },
    {
      dropdownDisplay: (
        <Fragment>
          <strong>
            {i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.searchApplication.title',
              {
                defaultMessage: 'An out-of-the-box search experience',
              }
            )}
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.searchApplication.description',
                {
                  defaultMessage: 'Easily build search-powered applications',
                }
              )}
            </p>
          </EuiText>
        </Fragment>
      ),
      inputDisplay: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.searchApplication.inputDisplay',
        {
          defaultMessage: 'An out-of-the-box search experience',
        }
      ),
      value: featuresList.searchApplication.id,
    },
    {
      dropdownDisplay: (
        <Fragment>
          <strong>
            {i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.synonymns.title',
              {
                defaultMessage: 'Synonyms',
              }
            )}
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.synonymns.description',
                {
                  defaultMessage: 'Link different words or phrases with similar meanings',
                }
              )}
            </p>
          </EuiText>
        </Fragment>
      ),
      inputDisplay: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.synonymns.inputDisplay',
        {
          defaultMessage: 'Synonyms',
        }
      ),
      value: featuresList.synonyms.id,
    },
    {
      dropdownDisplay: (
        <Fragment>
          <strong>
            {i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.analytics.title',
              {
                defaultMessage: 'Analytics',
              }
            )}
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.analytics.description',
                {
                  defaultMessage: "Record and review users' interactions with search results",
                }
              )}
            </p>
          </EuiText>
        </Fragment>
      ),
      inputDisplay: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.analytics.inputDisplay',
        {
          defaultMessage: 'Analytics',
        }
      ),
      value: featuresList.analytics.id,
    },
    {
      dropdownDisplay: (
        <Fragment>
          <strong>
            {i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.other.title',
              {
                defaultMessage: 'Other',
              }
            )}
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.other.description',
                {
                  defaultMessage: 'Another feature not listed here',
                }
              )}
            </p>
          </EuiText>
        </Fragment>
      ),
      inputDisplay: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.other.inputDisplay',
        {
          defaultMessage: 'Other',
        }
      ),
      value: 'other',
    },
  ];

  const { formSubmitRequest, setAdditionalFeedback, setParticipateInUXLabs, setFeature } =
    useActions(WorkplaceSearchGateLogic);

  const { feature, participateInUXLabs } = useValues(WorkplaceSearchGateLogic);

  return (
    <EuiPanel hasShadow={false}>
      <EuiForm component="form" fullWidth>
        <EuiFormLabel>
          {i18n.translate('xpack.enterpriseSearch.workplaceSearch.gateForm.features.Label', {
            defaultMessage: 'What Workplace Search feature are you looking to use?',
          })}
        </EuiFormLabel>

        <EuiSpacer size="xs" />
        <EuiSuperSelect
          options={options}
          valueOfSelected={feature}
          placeholder={i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.gateForm.features.selectOption',
            {
              defaultMessage: 'Select an option',
            }
          )}
          onChange={(value) => setFeature(value)}
          itemLayoutAlign="top"
          hasDividers
          fullWidth
        />

        {feature && <EducationPanel featureContent={feature} />}
        <EuiSpacer />

        <EuiFormRow
          label={i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.gateForm.additionalFeedback.Label',
            {
              defaultMessage: 'Would you like to share any additional feedback?',
            }
          )}
          labelAppend={i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.gateForm.additionalFeedback.optionalLabel',
            {
              defaultMessage: 'Optional',
            }
          )}
        >
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiTextArea
                onChange={(e) => {
                  setAdditionalFeedback(e.target.value);
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="subdued" size="xs">
                <FormattedMessage
                  id="xpack.enterpriseSearch.workplaceSearch.gateForm.additionalFeedback.description"
                  defaultMessage=" By submitting feedback you acknowledge that you've read and agree to our {termsOfService}, and that Elastic may {contact} about our related products and services,
                    using the details you provide above. See {privacyStatementLink} for more
                    details or to opt-out at any time."
                  values={{
                    contact: (
                      <EuiLink href={docLinks.workplaceSearchGatedFormDataUse}>
                        <FormattedMessage
                          id="xpack.enterpriseSearch.workplaceSearch.gateForm.additionalFeedback.contact"
                          defaultMessage="contact you"
                        />
                      </EuiLink>
                    ),
                    privacyStatementLink: (
                      <EuiLink href={docLinks.workplaceSearchGatedFormPrivacyStatement}>
                        <FormattedMessage
                          id="xpack.enterpriseSearch.workplaceSearch.gateForm.additionalFeedback.readDataPrivacyStatementLink"
                          defaultMessage="Elastic’s Privacy Statement"
                        />
                      </EuiLink>
                    ),
                    termsOfService: (
                      <EuiLink href={docLinks.workplaceSearchGatedFormTermsOfService}>
                        <FormattedMessage
                          id="xpack.enterpriseSearch.workplaceSearch.gateForm.additionalFeedback.readTermsOfService"
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

        <EuiSpacer />

        <EuiFormRow
          labelAppend={i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.gateForm.participateUxLab.optionalLabel',
            {
              defaultMessage: 'Optional',
            }
          )}
          label={i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.gateForm.participateUxLab.Label',
            {
              defaultMessage: 'Join our user research studies to improve Elasticsearch?',
            }
          )}
        >
          <EuiSelect
            hasNoInitialSelection
            options={[
              {
                text: i18n.translate(
                  'xpack.enterpriseSearch.workplaceSearch.gateForm.participateUxLab.Label.Yes',
                  {
                    defaultMessage: 'Yes',
                  }
                ),
                value: participateInUXLabsChoice.yes.choice,
              },
              {
                text: i18n.translate(
                  'xpack.enterpriseSearch.workplaceSearch.gateForm.participateUxLab.Label.No',
                  {
                    defaultMessage: 'No',
                  }
                ),
                value: participateInUXLabsChoice.no.choice,
              },
            ]}
            onChange={(e) =>
              setParticipateInUXLabs(
                e.target.value === participateInUXLabsChoice.yes.choice
                  ? participateInUXLabsChoice.yes.value
                  : participateInUXLabsChoice.no.value
              )
            }
            value={
              participateInUXLabs != null
                ? participateInUXLabs
                  ? participateInUXLabsChoice.yes.choice
                  : participateInUXLabsChoice.no.choice
                : undefined
            }
          />
        </EuiFormRow>

        <EuiSpacer />
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              isDisabled={!feature ?? false}
              type="submit"
              fill
              onClick={() => formSubmitRequest()}
            >
              {i18n.translate('xpack.enterpriseSearch.workplaceSearch.gateForm.submit', {
                defaultMessage: 'Submit',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    </EuiPanel>
  );
};
