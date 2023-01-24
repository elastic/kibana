/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef } from 'react';
import { EuiEmptyPrompt, EuiButton, EuiTitle, EuiLink } from '@elastic/eui';
import { useEnablement } from '../../../../hooks/use_enablement';
import { kibanaService } from '../../../../../../utils/kibana_service';
import * as labels from './labels';

export const EnablementEmptyState = () => {
  const { error, enablement, enableSynthetics, loading } = useEnablement();
  const [shouldFocusEnablementButton, setShouldFocusEnablementButton] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const { isEnabled, canEnable } = enablement;
  const isEnabledRef = useRef(isEnabled);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isEnabled && isEnabledRef.current === true) {
      /* shift focus to enable button when enable toggle disappears. Prevent
       * focus loss on the page */
      setShouldFocusEnablementButton(true);
    }
    isEnabledRef.current = Boolean(isEnabled);
  }, [isEnabled]);

  useEffect(() => {
    if (isEnabling && isEnabled) {
      setIsEnabling(false);
      kibanaService.toasts.addSuccess({
        title: labels.SYNTHETICS_ENABLE_SUCCESS,
        toastLifeTimeMs: 3000,
      });
    } else if (isEnabling && error) {
      setIsEnabling(false);
      kibanaService.toasts.addSuccess({
        title: labels.SYNTHETICS_DISABLE_SUCCESS,
        toastLifeTimeMs: 3000,
      });
    }
  }, [isEnabled, isEnabling, error]);

  const handleEnableSynthetics = () => {
    enableSynthetics();
    setIsEnabling(true);
  };

  useEffect(() => {
    if (shouldFocusEnablementButton) {
      buttonRef.current?.focus();
    }
  }, [shouldFocusEnablementButton]);

  return !isEnabled && !loading ? (
    <EuiEmptyPrompt
      title={
        <h2>
          {canEnable
            ? labels.MONITOR_MANAGEMENT_ENABLEMENT_LABEL
            : labels.MONITOR_MANAGEMENT_DISABLED_LABEL}
        </h2>
      }
      body={
        <p>
          {canEnable
            ? labels.MONITOR_MANAGEMENT_ENABLEMENT_MESSAGE
            : labels.MONITOR_MANAGEMENT_DISABLED_MESSAGE}
        </p>
      }
      actions={
        canEnable ? (
          <EuiButton
            color="primary"
            fill
            onClick={handleEnableSynthetics}
            data-test-subj="syntheticsEnableButton"
            buttonRef={buttonRef}
          >
            {labels.MONITOR_MANAGEMENT_ENABLEMENT_BTN_LABEL}
          </EuiButton>
        ) : null
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <h3>{labels.LEARN_MORE_LABEL}</h3>
          </EuiTitle>
          <EuiLink
            href="https://docs.google.com/document/d/1hkzFibu9LggPWXQqfbAd0mMlV75wCME7_BebXlEH-oI"
            target="_blank"
          >
            {labels.DOCS_LABEL}
          </EuiLink>
        </>
      }
    />
  ) : null;
};
