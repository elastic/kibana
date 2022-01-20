/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FunctionComponent } from 'react';
import React, { useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { EuiCallOut, EuiButton, EuiCode } from '@elastic/eui';

import type { NotificationsSetup } from 'src/core/public';

import { ILM_POLICY_NAME } from '../../../../common/constants';

import { useInternalApiClient } from '../../../lib/reporting_api_client';

const i18nTexts = {
  title: i18n.translate('xpack.reporting.listing.ilmPolicyCallout.migrationNeededTitle', {
    defaultMessage: 'Apply new lifecycle policy for reports',
  }),
  description: (
    <FormattedMessage
      id="xpack.reporting.listing.ilmPolicyCallout.migrationNeededDescription"
      defaultMessage="To ensure your reports are managed consistently, all reporting indices should use the {ilmPolicyName} policy."
      values={{
        ilmPolicyName: <EuiCode>{ILM_POLICY_NAME}</EuiCode>,
      }}
    />
  ),
  buttonLabel: i18n.translate(
    'xpack.reporting.listing.ilmPolicyCallout.migrateIndicesButtonLabel',
    {
      defaultMessage: 'Apply {ilmPolicyName} policy',
      values: {
        ilmPolicyName: ILM_POLICY_NAME,
      },
    }
  ),
  migrateErrorTitle: i18n.translate(
    'xpack.reporting.listing.ilmPolicyCallout.migrateIndicesErrorTitle',
    {
      defaultMessage: 'Could not migrate reporting indices',
    }
  ),
  migrateSuccessTitle: i18n.translate(
    'xpack.reporting.listing.ilmPolicyCallout.migrateIndicesSuccessTitle',
    {
      defaultMessage: 'Reporting policy active for all reporting indices',
    }
  ),
};

interface Props {
  toasts: NotificationsSetup['toasts'];
  onMigrationDone: () => void;
}

export const IlmPolicyMigrationNeededCallOut: FunctionComponent<Props> = ({
  toasts,
  onMigrationDone,
}) => {
  const [isMigratingIndices, setIsMigratingIndices] = useState(false);
  const isMounted = useMountedState();

  const { apiClient } = useInternalApiClient();

  const migrateReportingIndices = async () => {
    try {
      setIsMigratingIndices(true);
      await apiClient.migrateReportingIndicesIlmPolicy();
      onMigrationDone();
      toasts.addSuccess({ title: i18nTexts.migrateSuccessTitle });
    } catch (e) {
      toasts.addError(e, {
        title: i18nTexts.migrateErrorTitle,
        toastMessage: e.body?.message,
      });
    } finally {
      if (isMounted()) setIsMigratingIndices(false);
    }
  };

  return (
    <EuiCallOut data-test-subj="migrateReportingIndicesPolicyCallOut" title={i18nTexts.title}>
      <p>{i18nTexts.description}</p>
      <EuiButton
        data-test-subj="migrateReportingIndicesButton"
        isLoading={isMigratingIndices}
        onClick={migrateReportingIndices}
      >
        {i18nTexts.buttonLabel}
      </EuiButton>
    </EuiCallOut>
  );
};
