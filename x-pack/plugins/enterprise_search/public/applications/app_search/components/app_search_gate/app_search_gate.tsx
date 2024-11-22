/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

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

import { AppSearchGateLogic } from './app_search_gate_logic';

const featuresList = {
  webCrawler: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.webCrawler.featureButtonLabel',
      {
        defaultMessage: 'Try Open Crawler',
      }
    ),
    actionLink: 'https://github.com/elastic/crawler?tab=readme-ov-file#setup',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.webCrawler.featureDescription',
      {
        defaultMessage: 'Ingest web content into Elasticsearch using a web crawler',
      }
    ),
    id: 'webCrawler',
    learnMore: 'https://github.com/elastic/crawler#readme ',
    panelText: i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.webCrawler.panelText', {
      defaultMessage:
        'Did you know the new self-managed Elastic open crawler is now available? You can keep your web content in sync with your search-optimized indices!',
    }),
    title: i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.webCrawler.featureName', {
      defaultMessage: 'Web crawler',
    }),
  },
  analyticsAndLogs: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.analyticsAndLogs.featureButtonLabel',
      {
        defaultMessage: 'Add search analytics',
      }
    ),
    actionLink:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/behavioral-analytics-event.html',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.analyticsAndLogs.featureDescription',
      {
        defaultMessage: 'Add and view analytics and logs for your search application',
      }
    ),
    id: 'analyticsAndLogs',
    learnMore:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/behavioral-analytics-overview.html',
    panelText: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.analyticsAndLogs.panelText',
      {
        defaultMessage:
          "You can track and analyze users' searching and clicking behavior with Behavioral Analytics. Instrument your website or application to track relevant user actions.",
      }
    ),
    title: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.analyticsAndLogs.featureName',
      {
        defaultMessage: 'Search analytics and logs',
      }
    ),
  },
  synonyms: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.synonyms.featureButtonLabel',
      {
        defaultMessage: 'Search with synonyms',
      }
    ),
    actionLink:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/synonyms-apis.html',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.synonyms.featureDescription',
      {
        defaultMessage: 'Perform search with synonym based query expansion',
      }
    ),
    id: 'synonyms',
    learnMore:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-with-synonyms.html',
    panelText: i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.synonyms.panelText', {
      defaultMessage:
        'Use the Elasticsearch Synonyms APIs to easily create and manage synonym sets.',
    }),
    title: i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.synonyms.featureName', {
      defaultMessage: 'Search with synonyms',
    }),
  },
  relevanceTuning: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.relevanceTuning.featureButtonLabel',
      {
        defaultMessage: 'Tune search relevancy',
      }
    ),
    actionLink:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-with-elasticsearch.html',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.relevanceTuning.featureDescription',
      {
        defaultMessage: 'Tune the relevancy of your results using ranking and boosting methods',
      }
    ),
    id: 'relevanceTuning',
    learnMore:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-boosting-query.html',
    panelText: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.relevanceTuning.panelText',
      {
        defaultMessage: "Elasticsearch's query DSL provides an in-depth set of relevance tools.",
      }
    ),
    title: i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.relevanceTuning.featureName', {
      defaultMessage: 'Relevance tuning',
    }),
  },
  curations: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.curations.featureButtonLabel',
      {
        defaultMessage: 'Use query rules',
      }
    ),
    actionLink:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-using-query-rules.html',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.curations.featureDescription',
      {
        defaultMessage: 'Curate and pin results for specific queries',
      }
    ),
    id: 'curations',
    learnMore: 'https://www.elastic.co/blog/introducing-query-rules-elasticsearch-8-10',
    panelText: i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.curations.panelText', {
      defaultMessage:
        'Query rules provide a more robust set of tools to customize your search results for queries that match specific criteria and metadata.',
    }),
    title: i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.curations.featureName', {
      defaultMessage: 'Curate results',
    }),
  },
  searchManagementUis: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.searchManagementUis.featureButtonLabel',
      {
        defaultMessage: 'Build a search experience with Search UI',
      }
    ),
    actionLink: 'https://www.elastic.co/docs/current/search-ui/overview',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.searchManagementUis.featureDescription',
      {
        defaultMessage:
          'Use graphical user interfaces (GUIs) to manage your search application experience',
      }
    ),
    id: 'searchManagementUis',
    learnMore: 'https://www.elastic.co/docs/current/search-ui/tutorials/elasticsearch',
    panelText: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.searchManagementUis.panelText',
      {
        defaultMessage:
          'Search UI provides the components needed to build a modern search experience.',
      }
    ),
    title: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.searchManagementUis.featureName',
      {
        defaultMessage: 'Search and management UIs',
      }
    ),
  },
  credentials: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.credentials.featureButtonLabel',
      {
        defaultMessage: 'Secure with Elasticsearch',
      }
    ),
    actionLink:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/document-level-security.html',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.credentials.featureDescription',
      {
        defaultMessage:
          'Manage your users and roles, and credentials for accessing your search endpoints',
      }
    ),
    id: 'credentials',
    learnMore: 'https://www.elastic.co/search-labs/blog/dls-internal-knowledge-search',
    panelText: i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.credentials.panelText', {
      defaultMessage:
        'Elasticsearch provides a comprehensive set of security features, including document-level security and role-based access control.',
    }),
    title: i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.credentials.featureName', {
      defaultMessage: 'Credentials and roles',
    }),
  },
};

interface FeatureOption {
  id: string;
  title: string;
  description: string;
  learnMore: string | undefined;
  actionLabel: string;
  actionLink: string;
  panelText: string;
  addOnLearnMoreLabel?: string;
  addOnLearnMoreUrl?: string;
}

const getFeature = (id: string): FeatureOption | undefined => {
  switch (id) {
    case featuresList.webCrawler.id:
      return featuresList.webCrawler;
    case featuresList.analyticsAndLogs.id:
      return featuresList.analyticsAndLogs;
    case featuresList.synonyms.id:
      return featuresList.synonyms;
    case featuresList.relevanceTuning.id:
      return featuresList.relevanceTuning;
    case featuresList.curations.id:
      return featuresList.curations;
    case featuresList.searchManagementUis.id:
      return featuresList.searchManagementUis;
    case featuresList.credentials.id:
      return featuresList.credentials;
    default:
      return undefined;
  }
};

interface FeatureOptionsSelection {
  dropdownDisplay: React.ReactNode;
  inputDisplay: string;
  value: string;
}

const getOptionsFeaturesList = (): FeatureOptionsSelection[] => {
  const baseTranslatePrefix = 'xpack.enterpriseSearch.appSearch.gateForm.superSelect';

  const featureList = Object.keys(featuresList).map((featureKey): FeatureOptionsSelection => {
    const feature = getFeature(featureKey);
    if (!feature) {
      return {
        dropdownDisplay: <></>,
        inputDisplay: '',
        value: '',
      };
    }

    return {
      dropdownDisplay: (
        <>
          <strong>{feature.title}</strong>
          <EuiText size="s" color="subdued">
            <p>{feature.description}</p>
          </EuiText>
        </>
      ),
      inputDisplay: feature.title,
      value: feature.id,
    };
  });

  featureList.push({
    dropdownDisplay: (
      <>
        <strong>
          {i18n.translate(`${baseTranslatePrefix}.other.title`, {
            defaultMessage: 'Other',
          })}
        </strong>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate(`${baseTranslatePrefix}.other.description`, {
              defaultMessage: 'Another feature not listed here',
            })}
          </p>
        </EuiText>
      </>
    ),
    inputDisplay: i18n.translate(`${baseTranslatePrefix}.other.inputDisplay`, {
      defaultMessage: 'Other',
    }),
    value: 'other',
  });

  return featureList;
};

const participateInUXLabsChoice = {
  no: { choice: 'no', value: false },
  yes: { choice: 'yes', value: true },
};

const EducationPanel: React.FC<{ featureContent: string }> = ({ featureContent }) => {
  const feature = getFeature(featureContent);
  const { setFeaturesOther } = useActions(AppSearchGateLogic);
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
                      'xpack.enterpriseSearch.appSearch.gateForm.educationalPanel.title',
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
                      'xpack.enterpriseSearch.appSearch.gateForm.educationalPanel.subTitle',
                      {
                        defaultMessage: 'Based on your selection we recommend:',
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
          <p>{feature.panelText}</p>
          <EuiFlexGroup gutterSize="m" wrap alignItems="baseline">
            {feature.actionLink !== undefined && feature.actionLabel !== undefined && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  href={feature.actionLink}
                  target="_blank"
                  iconType="sortRight"
                  iconSide="right"
                >
                  {feature.actionLabel}
                </EuiButton>
              </EuiFlexItem>
            )}

            {feature.learnMore !== undefined && (
              <EuiFlexItem grow={false}>
                <EuiLink href={feature.learnMore} target="_blank">
                  {i18n.translate(
                    'xpack.enterpriseSearch.appSearch.gateForm.educationalPanel.learnMore',
                    {
                      defaultMessage: 'Learn more',
                    }
                  )}
                </EuiLink>
              </EuiFlexItem>
            )}

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
          label={i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.featureOther.Label', {
            defaultMessage: "Can you explain what other feature(s) you're looking for?",
          })}
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

export const AppSearchGate: React.FC = () => {
  const { feature, participateInUXLabs } = useValues(AppSearchGateLogic);
  const { formSubmitRequest, setAdditionalFeedback, setParticipateInUXLabs, setFeature } =
    useActions(AppSearchGateLogic);
  const options = getOptionsFeaturesList();
  return (
    <EuiPanel hasShadow={false}>
      <EuiForm component="form" fullWidth>
        <EuiFormLabel>
          {i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.features.Label', {
            defaultMessage: 'What App Search feature are you looking to use?',
          })}
        </EuiFormLabel>

        <EuiSpacer size="xs" />
        <EuiSuperSelect
          options={options}
          valueOfSelected={feature}
          placeholder={i18n.translate(
            'xpack.enterpriseSearch.appSearch.gateForm.features.selectOption',
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
            'xpack.enterpriseSearch.appSearch.gateForm.additionalFeedback.Label',
            {
              defaultMessage: 'Would you like to share any additional feedback?',
            }
          )}
          labelAppend={i18n.translate(
            'xpack.enterpriseSearch.appSearch.gateForm.additionalFeedback.optionalLabel',
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
                  id="xpack.enterpriseSearch.appSearch.gateForm.additionalFeedback.description"
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
            'xpack.enterpriseSearch.appSearch.gateForm.participateUxLab.optionalLabel',
            {
              defaultMessage: 'Optional',
            }
          )}
          label={i18n.translate(
            'xpack.enterpriseSearch.appSearch.gateForm.participateUxLab.Label',
            {
              defaultMessage: 'Join our user research studies to improve Elasticsearch?',
            }
          )}
        >
          <EuiSelect
            hasNoInitialSelection={participateInUXLabs === null}
            options={[
              {
                text: i18n.translate(
                  'xpack.enterpriseSearch.appSearch.gateForm.participateUxLab.Label.Yes',
                  {
                    defaultMessage: 'Yes',
                  }
                ),
                value: participateInUXLabsChoice.yes.choice,
              },
              {
                text: i18n.translate(
                  'xpack.enterpriseSearch.appSearch.gateForm.participateUxLab.Label.No',
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
              participateInUXLabs !== null
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
              {i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.submit', {
                defaultMessage: 'Submit',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    </EuiPanel>
  );
};
