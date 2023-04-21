/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef } from 'react';
import { EuiEmptyPrompt, EuiTitle, EuiLink } from '@elastic/eui';
import { useEnablement } from '../../../../hooks/use_enablement';
import { kibanaService } from '../../../../../../utils/kibana_service';
import * as labels from './labels';

export const EnablementEmptyState = () => {
  const { error, enablement, loading } = useEnablement();
  const [shouldFocusEnablementButton, setShouldFocusEnablementButton] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const { isEnabled } = enablement;
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

  useEffect(() => {
    if (shouldFocusEnablementButton) {
      buttonRef.current?.focus();
    }
  }, [shouldFocusEnablementButton]);

  return !isEnabled && !loading ? (
    <EuiEmptyPrompt
      title={<h2>{labels.SYNTHETICS_APP_DISABLED_LABEL}</h2>}
      body={<p>{labels.MONITOR_MANAGEMENT_DISABLED_MESSAGE}</p>}
      footer={
        <>
          <EuiTitle size="xxs">
            <h3>{labels.LEARN_MORE_LABEL}</h3>
          </EuiTitle>
          <EuiLink
            data-test-subj="syntheticsEnablementEmptyStateLink"
            href="https://www.elastic.co/guide/en/observability/current/synthetics-get-started-ui.html#uptime-set-up-prereq"
            target="_blank"
          >
            {labels.DOCS_LABEL}
          </EuiLink>
        </>
      }
    />
  ) : null;
};
