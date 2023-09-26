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

import { WorkplaceSearchGatePageTemplate } from '../../components/layout';

import { WorkplaceSearchGateLogic } from './workplace_search_gate_logic';

const getFeature = (id: string) => {
  switch (id) {
    case featuresList.searchApplication.id:
      return featuresList.searchApplication;
    case featuresList.contentSources.id:
      return featuresList.contentSources;
    case featuresList.contentExtraction.id:
      return featuresList.contentExtraction;
    case featuresList.documentLevelPermission.id:
      return featuresList.documentLevelPermission;
    case featuresList.synonyms.id:
      return featuresList.synonyms;
    case featuresList.analytics.id:
      return featuresList.analytics;
  }
};
const featuresList = {
  analytics: {
    actionLabel: 'Start with Behavioral Analytics',
    actionLink: '/app/enterprise_search/analytics ',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.analytics.featureDescription',
      {
        defaultMessage:
          "Did you know you can easily analyze your users' searching and clicking behavior with Behavioral Analytics? Instrument your website or application for tracking relevant user actions.",
      }
    ),
    id: 'analytics',
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
    actionLink: '/app/enterprise_search/content/search_indices/new_index/select_connector',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,

    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.connectorExtraction.featureDescription',
      {
        defaultMessage:
          'Did you know you have access to powerful content extraction via Elastic connectors! Use our powerful and highly adaptable extraction capabilities to extract contents from your files. ',
      }
    ),
    id: 'contentExtraction',
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
    actionLink: '/app/enterprise_search/content/search_indices/new_index/select_connector',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.connectorSources.featureDescription',
      {
        defaultMessage:
          'Did you know Elastic connectors are now available? You can keep content on your data sources in sync with your search-optimized indices! ',
      }
    ),
    id: 'contentSources',
    learnMore: 'https://www.elastic.co/guide/en/enterprise-search/current/connectors.html ',
    title: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.connectorSources.featureName',
      {
        defaultMessage: 'Use Elastic connectors',
      }
    ),
  },
  documentLevelPermission: {
    actionLabel: undefined,
    actionLink: undefined,
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,

    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.docLevelPermission.featureDescription',
      {
        defaultMessage:
          'Did you know you can restrict access to documents in your Elasticsearch indices according to user and group permissions? Return only authorized search results for users with Elastic’s document level security. ',
      }
    ),
    id: 'documentLevelPermissions',
    learnMore: 'https://www.elastic.co/guide/en/enterprise-search/current/dls.html',
    title: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.docLevelPermission.featureName',
      {
        defaultMessage: 'Use Elastic connectors',
      }
    ),
  },
  searchApplication: {
    actionLabel: 'Create a Search Application',
    actionLink: '/app/enterprise_search/content/search_indices/new_index/select_connector',
    addOnLearnMoreLabel: 'Search UI',
    addOnLearnMoreUrl: 'https://www.elastic.co/guide/en/enterprise-search/current/search-ui.html  ',
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.searchApplication.featureDescription',
      {
        defaultMessage:
          'Did you know you can restrict access to documents in your Elasticsearch indices according to user and group permissions? Return only authorized search results for users with Elastic’s document level security. ',
      }
    ),
    id: 'searchApplication',
    learnMore: 'https://www.elastic.co/guide/en/enterprise-search/current/search-applications.html',
    title: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.gateForm.searchApplication.featureName',
      {
        defaultMessage: 'Create Search Application',
      }
    ),
  },
  synonyms: {
    actionLabel: 'Search with synonyms',
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
    id: 'synonyms',
    learnMore: 'https://www.elastic.co/guide/en/elasticsearch/reference/8.10/synonyms-apis.html',
    title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.gateForm.synonyms.featureName', {
      defaultMessage: 'Search with Synonyms API',
    }),
  },
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

            {feature.addOnLearnMoreLabel !== undefined && feature.addOnLearnMoreUrl !== undefined && (
              <EuiFlexItem grow={false}>
                <EuiLink type="button" href={feature.addOnLearnMoreUrl} target="_blank" external>
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
export const WorkplaceSearchGate: React.FC<{ isLoading: boolean }> = ({ isLoading }) => {
  const options = [
    {
      dropdownDisplay: (
        <Fragment>
          <strong>
            {i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.contentSource.title',
              {
                defaultMessage: 'Content Sources',
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
      value: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.value.contentSource.value',
        {
          defaultMessage: 'contentSources',
        }
      ),
    },
    {
      dropdownDisplay: (
        <Fragment>
          <strong>
            {i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.contentExtraction.title',
              {
                defaultMessage: 'Content Extraction',
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
          defaultMessage: 'Content Extraction',
        }
      ),
      value: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.value.contentExtraction.value',
        {
          defaultMessage: 'contentExtraction',
        }
      ),
    },
    {
      dropdownDisplay: (
        <Fragment>
          <strong>
            {i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.docLevelPermission.title',
              {
                defaultMessage: 'Document-level permissions',
              }
            )}
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.docLevelPermission.description',
                {
                  defaultMessage: 'Control access to specific documents',
                }
              )}
            </p>
          </EuiText>
        </Fragment>
      ),
      inputDisplay: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.docLevelPermission.inputDisplay',
        {
          defaultMessage: 'Document-level permissions',
        }
      ),
      value: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.value.docLevelPermission.value',
        {
          defaultMessage: 'documentLevelPermissions',
        }
      ),
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
      value: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.value.searchApplication.value',
        {
          defaultMessage: 'searchApplication',
        }
      ),
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
      value: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.value.synonymns.value',
        {
          defaultMessage: 'synonyms',
        }
      ),
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
      value: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.value.analytics.value',
        {
          defaultMessage: 'analytics',
        }
      ),
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
      value: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.value.other.value',
        {
          defaultMessage: 'other',
        }
      ),
    },
  ];

  const { setFormSubmitted, setAdditionalFeedback, setParticipateInUXLabs, setFeature } =
    useActions(WorkplaceSearchGateLogic);

  const { feature } = useValues(WorkplaceSearchGateLogic);
  return (
    <WorkplaceSearchGatePageTemplate
      pageChrome={[]}
      pageHeader={{
        description: (
          <FormattedMessage
            id="xpack.enterpriseSearch.workplaceSearch.gateForm.description"
            defaultMessage="The standalone Workplace Search product remains available in maintenance mode, and is not recommended for new search experiences. Instead, we recommend using our set of Elasticsearch-native tools, which our team is actively developing and improving, for your workplace search use case. These tools offer the flexibility and composability of working directly with Elasticsearch indices. Learn more about the context for this refocus in this {blogUrl}. To help choose which of these tools best suit your use case, we’ve created this recommendation wizard. Let us know what features you need, and we'll guide you to the best solutions. If you still want to go ahead and use the standalone Workplace Search product at this point, you can do so after submitting the form."
            values={{
              blogUrl: (
                <EuiLink
                  data-test-subj="workplaceSearch-gateForm-blog-link"
                  href="#"
                  target="_blank"
                  data-telemetry-id="workplaceSearch-gateForm-blog-viewLink"
                >
                  {i18n.translate('xpack.enterpriseSearch.workplaceSearch.gateForm.viewBlog', {
                    defaultMessage: 'blog',
                  })}
                </EuiLink>
              ),
            }}
          />
        ),
        pageTitle: i18n.translate('xpack.enterpriseSearch.workplaceSearch.gateForm.title', {
          defaultMessage: 'Before you begin...',
        }),
      }}
      pageViewTelemetry="Workplace Search Gate form"
      isLoading={isLoading}
    >
      <EuiPanel hasShadow={false}>
        <EuiForm component="form" fullWidth>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiFormLabel>
                {i18n.translate('xpack.enterpriseSearch.workplaceSearch.gateForm.features.Label', {
                  defaultMessage: 'What features are you looking to use',
                })}
              </EuiFormLabel>
            </EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiText color="danger" size="xs">
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.workplaceSearch.gateForm.features.required',
                      {
                        defaultMessage: 'Required',
                      }
                    )}
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
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
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiFormLabel>
                {i18n.translate(
                  'xpack.enterpriseSearch.workplaceSearch.gateForm.additionalFeedback.Label',
                  {
                    defaultMessage: 'Would you like to share any additional feedback?',
                  }
                )}
              </EuiFormLabel>
            </EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiText color="subdued" size="xs">
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.workplaceSearch.gateForm.features.optional',
                      {
                        defaultMessage: 'Optional',
                      }
                    )}
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
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
                  id="xpack.enterpriseSearch.workplaceSearch.gateForm.description"
                  defaultMessage=" By submitting feedback you acknowledge that you've read and agree to our {termsOfService}, and that Elastic may {contact} about our related products and services,
                    using the details you provide above. See {privacyStatementLink} for more
                    details or to opt-out at any time."
                  values={{
                    contact: (
                      <EuiLink href="#">
                        <FormattedMessage
                          id="xpack.enterpriseSearch.workplaceSearch.gateForm.contact"
                          defaultMessage="Contact You"
                        />
                      </EuiLink>
                    ),
                    privacyStatementLink: (
                      <EuiLink href="#">
                        <FormattedMessage
                          id="xpack.enterpriseSearch.workplaceSearch.gateForm.readDataPrivacyStatementLink"
                          defaultMessage="Elastic’s Privacy Statement"
                        />
                      </EuiLink>
                    ),
                    termsOfService: (
                      <EuiLink href="#">
                        <FormattedMessage
                          id="xpack.enterpriseSearch.workplaceSearch.gateForm.readTermsOfService"
                          defaultMessage="Terms of Service"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiFormLabel>
                {i18n.translate(
                  'xpack.enterpriseSearch.workplaceSearch.gateForm.participateUxLab.Label',
                  {
                    defaultMessage: 'Join our user research studies to improve Elasticsearch?',
                  }
                )}
              </EuiFormLabel>
            </EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiText color="subdued" size="xs">
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.workplaceSearch.gateForm.features.optional',
                      {
                        defaultMessage: 'Optional',
                      }
                    )}
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <EuiSelect
            hasNoInitialSelection
            options={[
              { text: 'Yes', value: 'yes' },
              { text: 'No', value: 'no' },
            ]}
            onChange={(e) => setParticipateInUXLabs(e.target.value)}
          />
          <EuiSpacer />
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                isDisabled={!feature ?? false}
                type="submit"
                fill
                onClick={setFormSubmitted}
              >
                {i18n.translate('xpack.enterpriseSearch.workplaceSearch.gateForm.submit', {
                  defaultMessage: 'Submit',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiForm>
      </EuiPanel>
    </WorkplaceSearchGatePageTemplate>
  );
};
