/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiSuperSelect,
  EuiSuperSelectOption,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TRUSTED_APPS_SUPPORTED_OS_TYPES } from '../../../../../../common/endpoint/constants';
import { LogicalConditionBuilder } from './logical_condition';

export const NewTrustedAppForm = memo(() => {
  const handleAndClick = useCallback(() => {}, []);
  const osOptions: Array<EuiSuperSelectOption<string>> = useMemo(() => {
    return TRUSTED_APPS_SUPPORTED_OS_TYPES.map((os) => {
      return {
        value: os,
        inputDisplay: os,
      };
    });
  }, []);

  return (
    <EuiForm>
      <EuiFormRow
        label={i18n.translate('xpack.securitySolution.trustedapps.create.name', {
          defaultMessage: 'Name your trusted app application',
        })}
      >
        <EuiFieldText name="name" />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.securitySolution.trustedapps.create.os', {
          defaultMessage: 'Select operating system',
        })}
      >
        <EuiSuperSelect name="os" options={osOptions} />
      </EuiFormRow>
      <EuiFormRow>
        <LogicalConditionBuilder entries={[]} os={'windows'} onAndClicked={handleAndClick} />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.securitySolution.trustedapps.create.description', {
          defaultMessage: 'Description',
        })}
      >
        <EuiTextArea name="description" />
      </EuiFormRow>
    </EuiForm>
  );
});

NewTrustedAppForm.displayName = 'NewTrustedAppForm';
