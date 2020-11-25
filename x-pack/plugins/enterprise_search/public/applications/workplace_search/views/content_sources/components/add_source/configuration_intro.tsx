/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import connectionIllustration from '../../../../assets/connection_illustration.svg';

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
  <div className="step-1">
    {header}
    <EuiFlexGroup
      justifyContent="flexStart"
      alignItems="flexStart"
      direction="row"
      responsive={false}
    >
      <EuiFlexItem className="adding-a-source__outer-box">
        <EuiFlexGroup
          justifyContent="flexStart"
          alignItems="stretch"
          direction="row"
          gutterSize="xl"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <div className="adding-a-source__intro-image">
              <img src={connectionIllustration} alt="connection illustration" />
            </div>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" className="adding-a-source__intro-steps">
              <EuiFlexItem>
                <EuiSpacer size="xl" />
                <EuiTitle size="l">
                  <h2>How to add {name}</h2>
                </EuiTitle>
                <EuiSpacer size="m" />
                <EuiText color="subdued" grow={false}>
                  <p>Quick setup, then all of your documents will be searchable.</p>
                </EuiText>
                <EuiSpacer size="l" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <div className="adding-a-source__intro-step">
                      <EuiText>
                        <h4>Step 1</h4>
                      </EuiText>
                    </div>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="m" grow={false}>
                      <h4>
                        Configure an OAuth application&nbsp;
                        <EuiBadge color="#6DCCB1">One-Time Action</EuiBadge>
                      </h4>
                      <p>
                        Setup a secure OAuth application through the content source that you or your
                        team will use to connect and synchronize content. You only have to do this
                        once per content source.
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <div className="adding-a-source__intro-step">
                      <EuiText>
                        <h4>Step 2</h4>
                      </EuiText>
                    </div>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="m" grow={false}>
                      <h4>Connect the content source</h4>
                      <p>
                        Use the new OAuth application to connect any number of instances of the
                        content source to Workplace Search.
                      </p>
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
                    Configure {name}
                  </EuiButton>
                </EuiFormRow>
                <EuiSpacer size="xl" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </div>
);
