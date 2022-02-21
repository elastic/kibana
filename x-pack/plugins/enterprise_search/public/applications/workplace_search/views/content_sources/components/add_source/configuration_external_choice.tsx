/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ConfigurationIntroProps {
  header: React.ReactNode;
  name: string;
  serviceType: string;
  advanceStepInternal(): void;
  advanceStepExternal(): void;
}

export const ConfigurationExternalChoice: React.FC<ConfigurationIntroProps> = ({
  name,
  advanceStepExternal,
  advanceStepInternal,
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
      <EuiFlexItem grow>
        <EuiSplitPanel.Outer color="plain" hasShadow={false} hasBorder>
          <EuiSplitPanel.Inner>
            <EuiFlexGroup
              justifyContent="center"
              alignItems="center"
              direction="column"
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem>
                <EuiText size="s">
                  <h4>{name}</h4>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <h3>
                    {i18n.translate(
                      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.internal.title',
                      {
                        defaultMessage: 'Default connector',
                      }
                    )}
                  </h3>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.internal.description',
                    {
                      defaultMessage: 'Use our out-of-the-box connector to get started quickly.',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiSplitPanel.Inner>
          <EuiSplitPanel.Inner color="subdued" paddingSize="none">
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiButton color="primary" fill onClick={advanceStepInternal}>
                  {i18n.translate(
                    'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.internal.button',
                    {
                      defaultMessage: 'Connect',
                    }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiSplitPanel.Outer color="plain" hasShadow={false} hasBorder>
          <EuiSplitPanel.Inner>
            <EuiFlexGroup
              justifyContent="center"
              alignItems="center"
              direction="column"
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem>
                <EuiText size="s">
                  <h4>{name}</h4>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <h3>
                    {i18n.translate(
                      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.internal.title',
                      {
                        defaultMessage: 'Custom connector',
                      }
                    )}
                  </h3>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.external.description',
                    {
                      defaultMessage:
                        'Set up a custom connector for more configurability and control.',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiSplitPanel.Inner>
          <EuiSplitPanel.Inner color="subdued" paddingSize="none">
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiButton color="primary" fill onClick={advanceStepExternal}>
                  {i18n.translate(
                    'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.external.button',
                    {
                      defaultMessage: 'Instructions',
                    }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);
