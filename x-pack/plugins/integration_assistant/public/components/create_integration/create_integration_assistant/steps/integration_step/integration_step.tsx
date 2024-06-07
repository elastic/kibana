/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import type { IntegrationSettings } from '../../types';

import * as i18n from './translations';
import { StepContentWrapper } from '../step_content_wrapper';

const MaxLogoSize = 1048576; // One megabyte

interface IntegrationStepProps {
  integrationSettings: IntegrationSettings | undefined;
  setIntegrationSettings: (param: IntegrationSettings) => void;
}

export const IntegrationStep = React.memo<IntegrationStepProps>(
  ({ integrationSettings, setIntegrationSettings }) => {
    const [logoError, setLogoError] = React.useState<string>();

    const setIntegrationValues = useCallback(
      (settings: Partial<IntegrationSettings>) =>
        setIntegrationSettings({ ...integrationSettings, ...settings }),
      [integrationSettings, setIntegrationSettings]
    );

    const onChange = useMemo(() => {
      return {
        title: (e: React.ChangeEvent<HTMLInputElement>) =>
          setIntegrationValues({ title: e.target.value }),
        description: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
          setIntegrationValues({ description: e.target.value }),
        logo: (files: FileList | null) => {
          setLogoError(undefined);
          const logoFile = files?.[0];
          if (!logoFile) {
            setIntegrationValues({ logo: undefined });
            return;
          }
          if (logoFile.size > MaxLogoSize) {
            setLogoError(`${logoFile.name} is too large, maximum size is 1Mb.`);
            return;
          }
          logoFile
            .arrayBuffer()
            .then((fileBuffer) => {
              const encodedLogo = window.btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
              setIntegrationValues({ logo: encodedLogo });
            })
            .catch((e) => {
              setLogoError(i18n.LOGO_ERROR);
            });
        },
      };
    }, [setIntegrationValues]);

    return (
      <StepContentWrapper title={i18n.TITLE} subtitle={i18n.DESCRIPTION}>
        <EuiPanel paddingSize="l" hasShadow={false} hasBorder>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiForm component="form" fullWidth>
                <EuiFormRow label={i18n.TITLE_LABEL}>
                  <EuiFieldText
                    name="title"
                    value={integrationSettings?.title ?? ''}
                    onChange={onChange.title}
                  />
                </EuiFormRow>
                <EuiFormRow label={i18n.DESCRIPTION_LABEL}>
                  <EuiTextArea
                    name="description"
                    value={integrationSettings?.description ?? ''}
                    onChange={onChange.description}
                  />
                </EuiFormRow>
                <EuiFormRow label={i18n.LOGO_LABEL}>
                  <>
                    <EuiFilePicker
                      id="logsSampleFilePicker"
                      initialPromptText={i18n.LOGO_DESCRIPTION}
                      onChange={onChange.logo}
                      display="large"
                      aria-label="Upload an svg logo image"
                      accept="image/svg+xml"
                      isInvalid={logoError != null}
                    />
                    <EuiSpacer size="xs" />
                    {logoError && (
                      <EuiText color="danger" size="xs">
                        {logoError}
                      </EuiText>
                    )}
                  </>
                </EuiFormRow>
              </EuiForm>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </StepContentWrapper>
    );
  }
);
IntegrationStep.displayName = 'IntegrationStep';
