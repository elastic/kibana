/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import connectionIllustration from '../../../../assets/connection_illustration.svg';

import {
  CONFIG_INTRO_ALT_TEXT,
  CONFIG_INTRO_STEPS_TEXT,
  CONFIG_INTRO_STEP1_HEADING,
  CONFIG_INTRO_STEP1_TEXT,
  CONFIG_INTRO_STEP1_BADGE,
  CONFIG_INTRO_STEP2_HEADING,
  CONFIG_INTRO_STEP2_TITLE,
  CONFIG_INTRO_STEP2_TEXT,
} from './constants';

interface ConfigurationIntroProps {
  header: React.ReactNode;
  name: string;
  advanceStep(): void;
}

export const ConfigurationIntro: React.FC<ConfigurationIntroProps> = ({
  name,
  advanceStep,
  header,
}) => (
  <>
    {header}
    <EuiSpacer />
    <EuiFlexGroup
      justifyContent="flexStart"
      alignItems="flexStart"
      direction="row"
      responsive={false}
    >
      <EuiFlexItem>
        <EuiPanel color="subdued" paddingSize="none">
          <EuiFlexGroup
            justifyContent="flexStart"
            alignItems="stretch"
            direction="row"
            gutterSize="xl"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <div className="adding-a-source__intro-image">
                <img src={connectionIllustration} alt={CONFIG_INTRO_ALT_TEXT} />
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup direction="column" className="adding-a-source__intro-steps">
                <EuiFlexItem>
                  <EuiSpacer size="xl" />
                  <EuiTitle size="l">
                    <h2>
                      {i18n.translate(
                        'xpack.enterpriseSearch.workplaceSearch.contentSource.configIntro.steps.title',
                        {
                          defaultMessage: 'How to add {name}',
                          values: { name },
                        }
                      )}
                    </h2>
                  </EuiTitle>
                  <EuiSpacer size="m" />
                  <EuiText color="subdued" grow={false}>
                    <p>{CONFIG_INTRO_STEPS_TEXT}</p>
                  </EuiText>
                  <EuiSpacer size="l" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup
                    alignItems="flexStart"
                    justifyContent="flexStart"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <div className="adding-a-source__intro-step">
                        <EuiTitle size="xs">
                          <h3>{CONFIG_INTRO_STEP1_HEADING}</h3>
                        </EuiTitle>
                      </div>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="m" grow={false}>
                        <h4>
                          <FormattedMessage
                            id="xpack.enterpriseSearch.workplaceSearch.contentSource.configIntro.step1.title"
                            defaultMessage="Configure an OAuth application {badge}"
                            values={{
                              badge: (
                                <EuiBadge color="#6DCCB1">{CONFIG_INTRO_STEP1_BADGE}</EuiBadge>
                              ),
                            }}
                          />
                        </h4>
                        <p>{CONFIG_INTRO_STEP1_TEXT}</p>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup
                    alignItems="flexStart"
                    justifyContent="flexStart"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <div className="adding-a-source__intro-step">
                        <EuiTitle size="xs">
                          <h4>{CONFIG_INTRO_STEP2_HEADING}</h4>
                        </EuiTitle>
                      </div>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="m" grow={false}>
                        <h4>{CONFIG_INTRO_STEP2_TITLE}</h4>
                        <p>{CONFIG_INTRO_STEP2_TEXT}</p>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiSpacer size="l" />
                  <EuiFormRow>
                    <EuiButton
                      color="primary"
                      data-test-subj="ConfigureStepButton"
                      fill
                      onClick={advanceStep}
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.workplaceSearch.contentSource.configIntro.configure.button',
                        {
                          defaultMessage: 'Configure {name}',
                          values: { name },
                        }
                      )}
                    </EuiButton>
                  </EuiFormRow>
                  <EuiSpacer size="xl" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);
