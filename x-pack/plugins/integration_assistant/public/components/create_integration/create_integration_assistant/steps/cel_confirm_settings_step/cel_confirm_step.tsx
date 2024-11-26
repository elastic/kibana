/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiCallOut,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
} from '@elastic/eui';
import type { KeyedSecuritySchemeObject, SecurityType } from 'oas/dist/types.cjs';
import type { CelAuthType } from '../../../../../../common';
import { StepContentWrapper } from '../step_content_wrapper';
import { useActions, type State } from '../../state';
import type { OnComplete } from './generation_modal';
import { GenerationModal } from './generation_modal';
import * as i18n from './translations';
import { EndpointSelection } from './endpoint_selection';
import type { IntegrationSettings } from '../../types';

export const authOptions = [
  { label: 'Basic' },
  { label: 'OAuth2' },
  { label: 'Digest' },
  { label: 'Header' },
];

interface CelConfirmStepProps {
  integrationSettings: State['integrationSettings'];
  celSuggestedPaths: State['celSuggestedPaths'];
  connector: State['connector'];
  isGenerating: State['isGenerating'];
}

export const CelConfirmStep = React.memo<CelConfirmStepProps>(
  ({ integrationSettings, celSuggestedPaths, connector, isGenerating }) => {
    const { setIsGenerating, setStep, setIntegrationSettings, setCelInputResult } = useActions();

    const [selectedPath, setSelectedPath] = useState<string>();
    const [selectedOtherPath, setSelectedOtherPath] = useState<string | undefined>();
    const [useOtherPath, setUseOtherPath] = useState<boolean>(false);

    const [selectedAuth, setSelectedAuth] = useState<string | undefined>();
    const [specDefinedAuthMethods, setSpecDefinedAuthMethods] = useState<
      Record<SecurityType, KeyedSecuritySchemeObject[]> | undefined
    >();
    const [invalidAuth, setInvalidAuth] = useState<boolean>(false);

    // useEffect(() => {
    //   setSelectedPath(celSuggestedPaths ? celSuggestedPaths[0] : '');
    // }, [celSuggestedPaths]);
    // useEffect(() => {
    //   const path = selectedPath ? selectedPath : selectedOtherPath;
    //   if (path) {
    //     const authMethods = integrationSettings?.apiSpec?.operation(path, 'get').prepareSecurity();
    //     setSpecDefinedAuthMethods(authMethods);
    //     setSelectedAuth(authMethods ? Object.keys(authMethods)[0] : '');
    //   }
    // }, [selectedPath, selectedOtherPath, integrationSettings?.apiSpec]);

    useEffect(() => {
      const path = selectedPath ? selectedPath : selectedOtherPath;
      if (path) {
        const authMethods = integrationSettings?.apiSpec?.operation(path, 'get').prepareSecurity();
        setSpecDefinedAuthMethods(authMethods);
        // setSelectedAuth(authMethods ? Object.keys(authMethods)[0] : '');
      }
    }, [selectedPath, selectedOtherPath, integrationSettings?.apiSpec]);

    const setIntegrationValues = useCallback(
      (settings: Partial<IntegrationSettings>) =>
        setIntegrationSettings({ ...integrationSettings, ...settings }),
      [integrationSettings, setIntegrationSettings]
    );

    const onChangeSuggestedPath = useCallback(
      (path: string) => {
        setSelectedPath(path);
        setUseOtherPath(path === 'Enter manually');
        if (path !== 'Enter manually') {
          setSelectedOtherPath(undefined);
          setIntegrationValues({ celPath: path });
        }
      },
      [setSelectedPath, setUseOtherPath, setIntegrationValues]
    );

    const onChangeOtherPath = useCallback(
      (field: EuiComboBoxOptionOption[]) => {
        const path = field && field.length ? field[0].label : undefined;
        setSelectedOtherPath(path);
        setIntegrationValues({ celPath: path });
      },
      [setSelectedOtherPath, setIntegrationValues]
    );

    const onChangeAuth = useCallback(
      (field: EuiComboBoxOptionOption[]) => {
        const auth = field && field.length ? field[0].label : undefined;
        setSelectedAuth(auth);

        const authType = auth?.toLowerCase() as CelAuthType;
        setIntegrationValues({ celAuth: authType });

        if (specDefinedAuthMethods && auth) {
          setInvalidAuth(!Object.keys(specDefinedAuthMethods).includes(auth));
        }
      },
      [setSelectedAuth, setIntegrationValues, setInvalidAuth, specDefinedAuthMethods]
    );

    const onGenerationCompleted = useCallback<OnComplete>(
      (result: State['celInputResult']) => {
        if (result) {
          setCelInputResult(result);
          setIsGenerating(false);
          setStep(7);
        }
      },
      [setCelInputResult, setIsGenerating, setStep]
    );
    const onGenerationClosed = useCallback(() => {
      setIsGenerating(false); // aborts generation
    }, [setIsGenerating]);

    return (
      <EuiFlexGroup direction="column" gutterSize="l" data-test-subj="celInputStep">
        <EuiFlexItem>
          <StepContentWrapper
            title={i18n.CONFIRM_ENDPOINT}
            subtitle={i18n.CONFIRM_ENDPOINT_DESCRIPTION}
          >
            <EuiForm component="form" fullWidth>
              <EndpointSelection
                integrationSettings={integrationSettings}
                pathSuggestions={celSuggestedPaths ?? []}
                selectedPath={selectedPath}
                selectedOtherPath={selectedOtherPath}
                useOtherEndpoint={useOtherPath}
                onChangeSuggestedPath={onChangeSuggestedPath}
                onChangeOtherPath={onChangeOtherPath}
              />
            </EuiForm>
          </StepContentWrapper>
        </EuiFlexItem>

        <EuiFlexItem>
          <StepContentWrapper title={i18n.CONFIRM_AUTH} subtitle={i18n.CONFIRM_AUTH_DESCRIPTION}>
            <EuiForm component="form" fullWidth>
              {/* <AuthSelection
                apiSpec={integrationSettings?.apiSpec}
                selectedAuth={selectedAuth}
                onChangeAuth={onChangeAuth}
              /> */}
              <EuiFlexGroup direction="column" gutterSize="l" data-test-subj="confirmSettingsStep">
                <EuiFormRow label={'Preferred method'}>
                  <EuiComboBox
                    singleSelection={{ asPlainText: true }}
                    fullWidth
                    options={authOptions}
                    selectedOptions={
                      selectedAuth === undefined ? undefined : [{ label: selectedAuth }]
                    }
                    onChange={onChangeAuth}
                  />
                </EuiFormRow>
                {invalidAuth && (
                  <EuiCallOut
                    title={i18n.AUTH_DOES_NOT_ALIGN}
                    size="s"
                    color="warning"
                    iconType="warning"
                  />
                )}
              </EuiFlexGroup>
            </EuiForm>
          </StepContentWrapper>
        </EuiFlexItem>

        {isGenerating && (
          <GenerationModal
            integrationSettings={integrationSettings}
            connector={connector}
            onComplete={onGenerationCompleted}
            onClose={onGenerationClosed}
          />
        )}
      </EuiFlexGroup>
    );
  }
);
CelConfirmStep.displayName = 'CelConfirmStep';
