/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiImage,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import icon from './imgs/openapis-icon.svg';
import { useActions, type State } from '../../state';
import * as i18n from './translations';
import { CelInputStep, isCelInputStepReadyToComplete } from './steps/cel_input_step';
import { CelConfirmStep, isCelConfirmStepReadyToComplete } from './steps/cel_confirm_settings_step';
import { Footer } from './footer';

const flyoutBodyCss = css`
  height: 100%;
  .euiFlyoutBody__overflowContent {
    height: 100%;
    padding: 0;
  }
`;

export type CelFlyoutStepName = 'upload_spec' | 'confirm_details' | 'success';
// const stepNames: Record<CelFlyoutStepName, string> = {
//   upload_spec: 'CEL Input Step',
//   confirm_details: 'CEL Review Step',
//   success: 'CEL Success Step',
// };

interface CreateCelConfigFlyoutProps {
  integrationSettings: State['integrationSettings'];
  isFlyoutGenerating: State['isFlyoutGenerating'];
  connector: State['connector'];
}

export const CreateCelConfigFlyout = React.memo<CreateCelConfigFlyoutProps>(
  ({ integrationSettings, isFlyoutGenerating, connector }) => {
    const { setShowCelCreateFlyout, setIsFlyoutGenerating, setCelInputResult } = useActions();

    const [celStep, setCelStep] = useState<CelFlyoutStepName>('upload_spec');
    const [suggestedPaths, setSuggestedPaths] = useState<string[]>([]);

    const isThisStepReadyToComplete = useMemo(() => {
      if (celStep === 'upload_spec') {
        return isCelInputStepReadyToComplete(integrationSettings);
      } else if (celStep === 'confirm_details') {
        return isCelConfirmStepReadyToComplete(integrationSettings);
      }
      return false;
    }, [celStep, integrationSettings]);

    const completeStep = useCallback(() => {
      if (!isThisStepReadyToComplete) {
        // If the user tries to navigate to the next step without completing the current step.
        return;
      }
      // telemetry.reportAssistantStepComplete({ step: state.step, stepName });
      setIsFlyoutGenerating(true);
    }, [isThisStepReadyToComplete, setIsFlyoutGenerating]);

    const onClose = useCallback(() => {
      setShowCelCreateFlyout(false);
      // // Clear the flyout
      // setSuggestedPaths([]);
      // setCelInputResult(undefined);
    }, [setShowCelCreateFlyout]);

    return (
      <EuiFlyout onClose={() => setShowCelCreateFlyout(false)}>
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiImage size={32} margin="s" src={icon} alt="" />
            <EuiTitle size="m">
              <h2>{i18n.OPEN_API_SPEC_TITLE}</h2>
            </EuiTitle>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody css={flyoutBodyCss}>
          {celStep === 'upload_spec' && (
            <CelInputStep
              integrationSettings={integrationSettings}
              connector={connector}
              isFlyoutGenerating={isFlyoutGenerating}
              setCelStep={setCelStep}
              setSuggestedPaths={setSuggestedPaths}
            />
          )}
          {celStep === 'confirm_details' && (
            <CelConfirmStep
              integrationSettings={integrationSettings}
              suggestedPaths={suggestedPaths}
              connector={connector}
              isFlyoutGenerating={isFlyoutGenerating}
            />
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <Footer
            isFlyoutGenerating={isFlyoutGenerating}
            celStep={celStep}
            isNextStepEnabled={isThisStepReadyToComplete && !isFlyoutGenerating}
            onClose={onClose}
            onNext={completeStep}
          />
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);
CreateCelConfigFlyout.displayName = 'CreateCelConfig';
