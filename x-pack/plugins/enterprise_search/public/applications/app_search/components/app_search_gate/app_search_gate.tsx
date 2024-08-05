/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from "react";
import { i18n } from "@kbn/i18n";
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
import { useActions, useValues } from "kea";
import { FormattedMessage } from '@kbn/i18n-react';
import { docLinks } from '../../../shared/doc_links';

import { AppSearchGateLogic } from "./app_search_gate_logic";

const featuresList = {
  webCrawler: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.webCrawler.featureButtonLabel',
      {
        defaultMessage: 'Web Crawler Label',
      }
    ),
    actionLink: './web-crawler',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.webCrawler.featureDescription',
      {
        defaultMessage:
          "Web crawler description",
      }
    ),
    id: 'webCrawler',
    learnMore: 'https://www.elastic.co/',
    title: i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.webCrawler.featureName', {
      defaultMessage: 'Web Crawler',
    }),
  },
  analyticsAndLogs: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.analyticsAndLogs.featureButtonLabel',
      {
        defaultMessage: 'analyticsAndLogs Label',
      }
    ),
    actionLink: './analyticsAndLogs',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.analyticsAndLogs.featureDescription',
      {
        defaultMessage:
          "analyticsAndLogs description",
      }
    ),
    id: 'analyticsAndLogs',
    learnMore: 'https://www.elastic.co/',
    title: i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.analyticsAndLogs.featureName', {
      defaultMessage: 'analyticsAndLogs',
    }),
  },
  synonyms: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.synonyms.featureButtonLabel',
      {
        defaultMessage: 'synonyms Label',
      }
    ),
    actionLink: './synonyms',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.synonyms.featureDescription',
      {
        defaultMessage:
          "synonyms description",
      }
    ),
    id: 'synonyms',
    learnMore: 'https://www.elastic.co/',
    title: i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.synonyms.featureName', {
      defaultMessage: 'synonyms',
    }),
  },
  relevanceTuning: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.relevanceTuning.featureButtonLabel',
      {
        defaultMessage: 'relevanceTuning Label',
      }
    ),
    actionLink: './relevanceTuning',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.relevanceTuning.featureDescription',
      {
        defaultMessage:
          "relevanceTuning description",
      }
    ),
    id: 'relevanceTuning',
    learnMore: 'https://www.elastic.co/',
    title: i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.relevanceTuning.featureName', {
      defaultMessage: 'relevanceTuning',
    }),
  },
  curations: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.curations.featureButtonLabel',
      {
        defaultMessage: 'curations Label',
      }
    ),
    actionLink: './curations',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.curations.featureDescription',
      {
        defaultMessage:
          "curations description",
      }
    ),
    id: 'curations',
    learnMore: 'https://www.elastic.co/',
    title: i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.curations.featureName', {
      defaultMessage: 'curations',
    }),
  },
  searchManagementUis: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.searchManagementUis.featureButtonLabel',
      {
        defaultMessage: 'searchManagementUis Label',
      }
    ),
    actionLink: './searchManagementUis',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.searchManagementUis.featureDescription',
      {
        defaultMessage:
          "searchManagementUis description",
      }
    ),
    id: 'searchManagementUis',
    learnMore: 'https://www.elastic.co/',
    title: i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.searchManagementUis.featureName', {
      defaultMessage: 'searchManagementUis',
    }),
  },
  credentials: {
    actionLabel: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.credentials.featureButtonLabel',
      {
        defaultMessage: 'credentials Label',
      }
    ),
    actionLink: './credentials',
    addOnLearnMoreLabel: undefined,
    addOnLearnMoreUrl: undefined,
    description: i18n.translate(
      'xpack.enterpriseSearch.appSearch.gateForm.credentials.featureDescription',
      {
        defaultMessage:
          "credentials description",
      }
    ),
    id: 'credentials',
    learnMore: 'https://www.elastic.co/',
    title: i18n.translate('xpack.enterpriseSearch.appSearch.gateForm.credentials.featureName', {
      defaultMessage: 'Credentials',
    }),
  },
};

const getFeature = (id: string) => {
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
  }
};

type FeatureOptionsSelection = {
  dropdownDisplay: React.ReactNode;
  inputDisplay: string;
  value: string;
};

const getOptionsFeaturesList = (): Array<FeatureOptionsSelection> => {
  return Object.keys(featuresList).map((featureKey): FeatureOptionsSelection => {
    let feature = getFeature(featureKey);
    if (!feature) {
      return {
        dropdownDisplay: (<></>),
        inputDisplay: '',
        value: ''
      };
    }

    return {
      dropdownDisplay: (
        <Fragment>
          <strong>
            {i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.contentSource.title',
              {
                defaultMessage: feature.title,
              }
            )}
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.contentSource.description',
                {
                  defaultMessage: feature.description,
                }
              )}
            </p>
          </EuiText>
        </Fragment>
      ),
      inputDisplay: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.gateForm.superSelect.contentSource.inputDisplay',
        {
          defaultMessage: feature.title,
        }
      ),
      value: feature.id,
    }
  });
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
