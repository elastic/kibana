/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { CelAuthType } from '../../../../../../../../common';
import { useActions, type State } from '../../../../state';
import type { OnComplete } from './generation_modal';
import { GenerationModal } from './generation_modal';
import * as i18n from './translations';
import { EndpointSelection } from './endpoint_selection';
import type { IntegrationSettings } from '../../../../types';
import { AuthSelection } from './auth_selection';

export const authOptions = [
  { label: 'Basic' },
  { label: 'OAuth2' },
  { label: 'Digest' },
  { label: 'Header' },
];

interface CelConfirmStepProps {
  integrationSettings: State['integrationSettings'];
  connector: State['connector'];
  isFlyoutGenerating: State['isFlyoutGenerating'];
  suggestedPaths: string[];
}

export const translatedAuthValue = (auth: string): string => {
  return auth === 'API Token' ? 'Header' : auth;
};

export const CelConfirmStep = React.memo<CelConfirmStepProps>(
  ({ integrationSettings, connector, isFlyoutGenerating, suggestedPaths }) => {
    const {
      setIsFlyoutGenerating,
      setIntegrationSettings,
      setCelInputResult,
      setShowCelCreateFlyout,
    } = useActions();

    const [selectedPath, setSelectedPath] = useState<string>();
    const [selectedOtherPath, setSelectedOtherPath] = useState<string | undefined>();
    const [useOtherPath, setUseOtherPath] = useState<boolean>(false);

    const [selectedAuth, setSelectedAuth] = useState<string | undefined>();
    const [specifiedAuthForPath, setSpecifiedAuthForPath] = useState<string[]>([]);
    const [invalidAuth, setInvalidAuth] = useState<boolean>(false);

    useEffect(() => {
      const path = selectedPath !== i18n.ENTER_MANUALLY ? selectedPath : selectedOtherPath;
      if (path) {
        const authMethods = integrationSettings?.apiSpec?.operation(path, 'get').prepareSecurity();
        const specifiedAuth = authMethods ? Object.keys(authMethods) : [];
        setSpecifiedAuthForPath(specifiedAuth);
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
        setUseOtherPath(path === i18n.ENTER_MANUALLY);
        if (path !== i18n.ENTER_MANUALLY) {
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

        if (auth) {
          const translatedAuth = translatedAuthValue(auth);
          setIntegrationValues({ celAuth: translatedAuth.toLowerCase() as CelAuthType });
          if (specifiedAuthForPath) {
            setInvalidAuth(!specifiedAuthForPath.includes(translatedAuth));
          }
        } else {
          setIntegrationValues({ celAuth: undefined });
          setInvalidAuth(false);
        }
      },
      [setIntegrationValues, specifiedAuthForPath]
    );

    const onGenerationCompleted = useCallback<OnComplete>(
      (result: State['celInputResult']) => {
        if (result) {
          setCelInputResult(result);
          setIsFlyoutGenerating(false);
          setShowCelCreateFlyout(false);
        }
      },
      [setCelInputResult, setIsFlyoutGenerating, setShowCelCreateFlyout]
    );
    const onGenerationClosed = useCallback(() => {
      setIsFlyoutGenerating(false); // aborts generation
    }, [setIsFlyoutGenerating]);

    return (
      <EuiFlexGroup direction="column" gutterSize="l" data-test-subj="celConfirmStep">
        <EuiPanel hasShadow={false} hasBorder={false}>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2>{i18n.CONFIRM_ENDPOINT}</h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s">{i18n.CONFIRM_ENDPOINT_DESCRIPTION}</EuiText>
            <EuiSpacer size="m" />
            <EndpointSelection
              integrationSettings={integrationSettings}
              pathSuggestions={suggestedPaths}
              selectedPath={selectedPath}
              selectedOtherPath={selectedOtherPath}
              useOtherEndpoint={useOtherPath}
              onChangeSuggestedPath={onChangeSuggestedPath}
              onChangeOtherPath={onChangeOtherPath}
            />
          </EuiFlexItem>
          <EuiSpacer size="xl" />
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2>{i18n.CONFIRM_AUTH}</h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s">{i18n.CONFIRM_AUTH_DESCRIPTION}</EuiText>
            <EuiSpacer size="m" />
            <AuthSelection
              selectedAuth={selectedAuth}
              specifiedAuthForPath={specifiedAuthForPath}
              invalidAuth={invalidAuth}
              onChangeAuth={onChangeAuth}
            />
          </EuiFlexItem>
        </EuiPanel>
        {isFlyoutGenerating && (
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
