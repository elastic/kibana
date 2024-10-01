/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import {
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
// @ts-expect-error untyped library
import { saveAs } from '@elastic/filesaver';
import { SectionWrapper } from '../../../../../common/components/section_wrapper';
import type { State } from '../../state';
import { SuccessSection } from '../../../../../common/components/success_section';
import { useDeployIntegration } from './use_deploy_integration';
import * as i18n from './translations';

interface DeployStepProps {
  integrationSettings: State['integrationSettings'];
  result: State['result'];
  celInputResult?: State['celInputResult'];
  connector: State['connector'];
}

export const DeployStep = React.memo<DeployStepProps>(
  ({ integrationSettings, result, celInputResult, connector }) => {
    const { isLoading, error, integrationFile, integrationName } = useDeployIntegration({
      integrationSettings,
      result,
      celInputResult,
      connector,
    });

    const onSaveZip = useCallback(() => {
      saveAs(integrationFile, `${integrationName ?? 'custom_integration'}.zip`);
    }, [integrationFile, integrationName]);

    if (isLoading || error) {
      return (
        <SectionWrapper title={i18n.DEPLOYING}>
          <EuiSpacer size="m" />
          <EuiFlexGroup direction="row" justifyContent="center">
            <EuiFlexItem grow={false}>
              {isLoading && <EuiLoadingSpinner size="xl" data-test-subj="deployStep-loading" />}
              {error && (
                <EuiText color="danger" size="s" data-test-subj="deployStep-error">
                  {error}
                </EuiText>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </SectionWrapper>
      );
    }
    if (integrationName) {
      return (
        <SuccessSection integrationName={integrationName}>
          <EuiSpacer size="m" />
          <EuiPanel hasShadow={false} hasBorder paddingSize="l" data-test-subj="deployStep-success">
            <EuiFlexGroup direction="row" alignItems="center">
              <EuiFlexItem>
                <EuiFlexGroup direction="row" alignItems="flexStart" justifyContent="flexStart">
                  <EuiFlexItem grow={false} css={{ marginTop: '3px' }}>
                    <EuiIcon type="download" color="primary" size="m" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup direction="column" gutterSize="xs">
                      <EuiFlexItem>
                        <EuiText>
                          <h4>{i18n.DOWNLOAD_ZIP_TITLE}</h4>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText color="subdued" size="s">
                          {i18n.DOWNLOAD_ZIP_DESCRIPTION}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink onClick={onSaveZip} data-test-subj="saveZipButton">
                  {i18n.DOWNLOAD_ZIP_LINK}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </SuccessSection>
      );
    }
    return null;
  }
);
DeployStep.displayName = 'DeployStep';
