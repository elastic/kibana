/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import * as labels from './labels';
import { useEnablement } from '../../../hooks';

export const DisabledCallout = ({ total }: { total?: number }) => {
  const { isEnabled, invalidApiKeyError, loading, isServiceAllowed, canEnable } = useEnablement();

  const showDisableCallout = !isEnabled && total && total > 0;
  const showInvalidApiKeyCallout = invalidApiKeyError && total && total > 0;

  if ((!showDisableCallout && !showInvalidApiKeyCallout && isServiceAllowed) || loading) {
    return null;
  }

  const disabledCallout =
    !canEnable && showDisableCallout && !loading ? (
      <>
        <EuiCallOut title={labels.CALLOUT_MANAGEMENT_DISABLED} color="warning">
          <p>{labels.CALLOUT_MANAGEMENT_DESCRIPTION}</p>
          <p>
            {labels.CALLOUT_MANAGEMENT_CONTACT_ADMIN}{' '}
            <EuiLink
              data-test-subj="syntheticsMonitorManagementPageLink"
              href="https://www.elastic.co/guide/en/observability/current/synthetics-get-started-ui.html#uptime-set-up-prereq"
              target="_blank"
            >
              {labels.LEARN_MORE_LABEL}
            </EuiLink>
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    ) : null;

  const disAllowedCallout = !isServiceAllowed ? (
    <>
      <EuiCallOut title={ACCOUNT_BLOCKED} color="warning">
        <p>{SERVICE_NOT_ALLOWED}</p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  ) : null;

  return (
    <>
      {disabledCallout}
      {disAllowedCallout}
    </>
  );
};

export const SERVICE_NOT_ALLOWED = i18n.translate('xpack.synthetics.synthetics.serviceNotAllowed', {
  defaultMessage:
    'Account is blocked from using Elastic managed locations, please contact support. Your monitors have been paused.',
});

const ACCOUNT_BLOCKED = i18n.translate('xpack.synthetics.synthetics.accountBlocked', {
  defaultMessage: 'Account is blocked.',
});
