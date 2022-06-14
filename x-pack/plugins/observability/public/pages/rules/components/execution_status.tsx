/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiHealth, EuiToolTip, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { RuleExecutionStatusErrorReasons } from '@kbn/alerting-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { ManageLicenseModal } from './manage_license_model';
import { getHealthColor, rulesStatusesTranslationsMapping } from '../config';
import { RULE_STATUS_LICENSE_ERROR } from '../translations';
import { ExecutionStatusProps } from '../types';
import { useKibana } from '../../../utils/kibana_react';

export function ExecutionStatus({ executionStatus, item, licenseType }: ExecutionStatusProps) {
  const { http } = useKibana().services;
  const [manageLicenseModalOpts, setManageLicenseModalOpts] = useState<{
    licenseType: string;
    ruleTypeId: string;
  } | null>(null);
  const healthColor = getHealthColor(executionStatus.status);
  const tooltipMessage =
    executionStatus.status === 'error' ? `Error: ${executionStatus?.error?.message}` : null;
  const isLicenseError = executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License;
  const statusMessage = isLicenseError
    ? RULE_STATUS_LICENSE_ERROR
    : rulesStatusesTranslationsMapping[executionStatus.status];

  const health = (
    <EuiHealth data-test-subj={`ruleStatus-${executionStatus.status}`} color={healthColor}>
      {statusMessage}
    </EuiHealth>
  );

  const healthWithTooltip = tooltipMessage ? (
    <EuiToolTip data-test-subj="ruleStatus-error-tooltip" position="top" content={tooltipMessage}>
      {health}
    </EuiToolTip>
  ) : (
    health
  );

  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem>{healthWithTooltip}</EuiFlexItem>
      {isLicenseError && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            data-test-subj="ruleStatus-error-license-fix"
            onClick={() =>
              setManageLicenseModalOpts({
                licenseType,
                ruleTypeId: item.ruleTypeId,
              })
            }
          >
            <FormattedMessage
              id="xpack.observability.rules.rulesTable.fixLicenseLink"
              defaultMessage="Fix"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      {manageLicenseModalOpts && (
        <ManageLicenseModal
          licenseType={manageLicenseModalOpts.licenseType}
          ruleTypeId={manageLicenseModalOpts.ruleTypeId}
          onConfirm={() => {
            window.open(`${http.basePath.get()}/app/management/stack/license_management`, '_blank');
            setManageLicenseModalOpts(null);
          }}
          onCancel={() => setManageLicenseModalOpts(null)}
        />
      )}
    </EuiFlexGroup>
  );
}
