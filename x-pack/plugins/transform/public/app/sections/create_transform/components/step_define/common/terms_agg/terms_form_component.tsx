/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import type { IPivotAggsConfigTerms } from './types';

export const TermsAggForm: IPivotAggsConfigTerms['AggFormComponent'] = ({
  aggConfig,
  onChange,
  isValid,
}) => {
  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.transform.agg.popoverForm.sizeLabel', {
          defaultMessage: 'Size',
        })}
        error={
          !isValid && [
            i18n.translate('xpack.transform.groupBy.popoverForm.invalidSizeErrorMessage', {
              defaultMessage: 'Enter a valid positive number',
            }),
          ]
        }
        isInvalid={!isValid}
      >
        <EuiFieldNumber
          value={aggConfig.size}
          onChange={(e) => {
            onChange({ size: Number(e.target.value) });
          }}
        />
      </EuiFormRow>
    </>
  );
};
