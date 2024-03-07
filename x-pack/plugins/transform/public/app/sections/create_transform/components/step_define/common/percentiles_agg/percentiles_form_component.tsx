/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import type { IPivotAggsConfigPercentiles } from './types';

export const PercentilesAggForm: IPivotAggsConfigPercentiles['AggFormComponent'] = ({
  aggConfig,
  onChange,
  isValid,
}) => {
  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.transform.agg.popoverForm.percentsLabel', {
          defaultMessage: 'Percents',
        })}
        error={
          !isValid && [
            i18n.translate('xpack.transform.groupBy.popoverForm.intervalPercents', {
              defaultMessage: 'Enter a comma-separated list of percentiles',
            }),
          ]
        }
        isInvalid={!isValid}
      >
        <EuiFieldText
          value={aggConfig.percents}
          onChange={(e) => {
            onChange({
              percents: e.target.value,
            });
          }}
        />
      </EuiFormRow>
    </>
  );
};
