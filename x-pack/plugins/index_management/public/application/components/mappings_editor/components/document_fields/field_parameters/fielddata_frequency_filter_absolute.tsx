/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFormControlLayoutDelimited,
  EuiFieldNumber,
  EuiFieldNumberProps,
  EuiFormRow,
} from '@elastic/eui';

import { FieldHook } from '../../../shared_imports';

interface Props {
  min: FieldHook;
  max: FieldHook;
}

export const FielddataFrequencyFilterAbsolute = ({ min, max }: Props) => {
  const minIsInvalid = !min.isChangingValue && min.errors.length > 0;
  const minErrorMessage = !min.isChangingValue && min.errors.length ? min.errors[0].message : null;

  const maxIsInvalid = !max.isChangingValue && max.errors.length > 0;
  const maxErrorMessage = !max.isChangingValue && max.errors.length ? max.errors[0].message : null;

  return (
    <EuiFormRow
      fullWidth
      isInvalid={minIsInvalid || maxIsInvalid}
      error={minErrorMessage || maxErrorMessage}
      label={
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.fielddata.frequencyFilterAbsoluteFieldLabel"
          defaultMessage="Absolute frequency range"
        />
      }
    >
      <EuiFormControlLayoutDelimited
        startControl={
          <EuiFieldNumber
            value={min.value as EuiFieldNumberProps['value']}
            onChange={min.onChange}
            isLoading={min.isValidating}
            isInvalid={minIsInvalid}
            fullWidth
            data-test-subj="input"
            controlOnly
            aria-label={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.fielddata.frequencyFilterAbsoluteMinAriaLabel',
              {
                defaultMessage: 'Minimum absolute frequency',
              }
            )}
          />
        }
        endControl={
          <EuiFieldNumber
            value={max.value as EuiFieldNumberProps['value']}
            onChange={max.onChange}
            isLoading={max.isValidating}
            isInvalid={maxIsInvalid}
            fullWidth
            data-test-subj="input"
            controlOnly
            aria-label={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.fielddata.frequencyFilterAbsoluteMaxAriaLabel',
              {
                defaultMessage: 'Maximum absolute frequency',
              }
            )}
          />
        }
      />
    </EuiFormRow>
  );
};
