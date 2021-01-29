/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';

import { EuiFormRow } from '@elastic/eui';

import { CombinedField } from './types';
import { CombinedFieldLabel } from './combined_field_label';

export function CombinedFieldsReadOnlyForm({
  combinedFields,
}: {
  combinedFields: CombinedField[];
}) {
  return combinedFields.length ? (
    <EuiFormRow
      label={i18n.translate('xpack.ml.fileDatavisualizer.combinedFieldsReadOnlyLabel', {
        defaultMessage: 'Combined fields',
      })}
      helpText={i18n.translate('xpack.ml.fileDatavisualizer.combinedFieldsReadOnlyHelpTextLabel', {
        defaultMessage: 'Edit combined fields in advanced tab',
      })}
    >
      <div>
        {combinedFields.map((combinedField: CombinedField, idx: number) => (
          <CombinedFieldLabel key={idx} combinedField={combinedField} />
        ))}
      </div>
    </EuiFormRow>
  ) : null;
}
