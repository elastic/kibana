/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt, EuiButton, EuiTitle, EuiLink } from '@elastic/eui';
import { useEnablement } from '../hooks/use_enablement';
import { kibanaService } from '../../../state/kibana_service';
import { SYNTHETICS_ENABLE_SUCCESS, SYNTHETICS_DISABLE_SUCCESS } from '../content';

export const EnablementEmptyState = ({ focusButton }: { focusButton: boolean }) => {
  const { error, enablement, enableSynthetics, loading } = useEnablement();
  const [isEnabling, setIsEnabling] = useState(false);
  const { isEnabled, canEnable } = enablement;
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isEnabling && isEnabled) {
      setIsEnabling(false);
      kibanaService.toasts.addSuccess({
        title: SYNTHETICS_ENABLE_SUCCESS,
        toastLifeTimeMs: 3000,
      });
    } else if (isEnabling && error) {
      setIsEnabling(false);
      kibanaService.toasts.addSuccess({
        title: SYNTHETICS_DISABLE_SUCCESS,
        toastLifeTimeMs: 3000,
      });
    }
  }, [isEnabled, isEnabling, error]);

  const handleEnableSynthetics = () => {
    enableSynthetics();
    setIsEnabling(true);
  };

  useEffect(() => {
    if (focusButton) {
      buttonRef.current?.focus();
    }
  }, [focusButton]);

  return !isEnabled && !loading ? (
    <EuiEmptyPrompt
      title={
        <h2>
          {canEnable ? MONITOR_MANAGEMENT_ENABLEMENT_LABEL : MONITOR_MANAGEMENT_DISABLED_LABEL}
        </h2>
      }
      body={
        <p>
          {canEnable ? MONITOR_MANAGEMENT_ENABLEMENT_MESSAGE : MONITOR_MANAGEMENT_DISABLED_MESSAGE}
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
            {MONITOR_MANAGEMENT_ENABLEMENT_BTN_LABEL}
          </EuiButton>
        ) : null
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <h3>{LEARN_MORE_LABEL}</h3>
          </EuiTitle>
          <EuiLink
            href="https://docs.google.com/document/d/1hkzFibu9LggPWXQqfbAd0mMlV75wCME7_BebXlEH-oI"
            target="_blank"
          >
            {DOCS_LABEL}
          </EuiLink>
        </>
      }
    />
  ) : null;
};

const MONITOR_MANAGEMENT_ENABLEMENT_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.emptyState.enablement.enabled.title',
  {
    defaultMessage: 'Enable Monitor Management',
  }
);

const MONITOR_MANAGEMENT_DISABLED_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.emptyState.enablement.disabled.title',
  {
    defaultMessage: 'Monitor Management is disabled',
  }
);

const MONITOR_MANAGEMENT_ENABLEMENT_MESSAGE = i18n.translate(
  'xpack.uptime.monitorManagement.emptyState.enablement',
  {
    defaultMessage:
      'Enable Monitor Management to run lightweight and real-browser monitors from hosted testing locations around the world. Enabling Monitor Management will generate an API key to allow the Synthetics Service to write back to your Elasticsearch cluster.',
  }
);

const MONITOR_MANAGEMENT_DISABLED_MESSAGE = i18n.translate(
  'xpack.uptime.monitorManagement.emptyState.enablement.disabledDescription',
  {
    defaultMessage:
      'Monitor Management is currently disabled. Monitor Management allows you to run lightweight and real-browser monitors from hosted testing locations around the world. To enable Monitor Management, please contact an administrator.',
  }
);

const MONITOR_MANAGEMENT_ENABLEMENT_BTN_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.emptyState.enablement.title',
  {
    defaultMessage: 'Enable',
  }
);

const DOCS_LABEL = i18n.translate('xpack.uptime.monitorManagement.emptyState.enablement.doc', {
  defaultMessage: 'Read the docs',
});

const LEARN_MORE_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.emptyState.enablement.learnMore',
  {
    defaultMessage: 'Want to learn more?',
  }
);
