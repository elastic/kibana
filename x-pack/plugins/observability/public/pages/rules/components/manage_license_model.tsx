/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiConfirmModal } from '@elastic/eui';
import { capitalize } from 'lodash';

interface Props {
  licenseType: string;
  ruleTypeId: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ManageLicenseModal({ licenseType, ruleTypeId, onConfirm, onCancel }: Props) {
  const licenseRequired = capitalize(licenseType);
  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.observability.rules.manageLicense.manageLicenseTitle', {
        defaultMessage: '{licenseRequired} license required',
        values: { licenseRequired },
      })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={i18n.translate(
        'xpack.observability.rules.manageLicense.manageLicenseConfirmButtonText',
        {
          defaultMessage: 'Manage license',
        }
      )}
      cancelButtonText={i18n.translate(
        'xpack.observability.rules.manageLicense.manageLicenseCancelButtonText',
        {
          defaultMessage: 'Cancel',
        }
      )}
      defaultFocusedButton="confirm"
      data-test-subj="manageLicenseModal"
    >
      <p>
        <FormattedMessage
          id="xpack.observability.rules.manageLicense.manageLicenseMessage"
          defaultMessage="Rule type {ruleTypeId} is disabled because it requires a {licenseRequired} license. Continue to License Management to view upgrade options."
          values={{ ruleTypeId, licenseRequired }}
        />
      </p>
    </EuiConfirmModal>
  );
}
