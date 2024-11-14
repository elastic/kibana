/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';
import type { DataViewFieldBase } from '@kbn/es-query';
import { UseField } from '../../../../../shared_imports';
import { MultiSelectFieldsAutocomplete } from '../../../../rule_creation_ui/components/multi_select_fields';
import { ALERT_SUPPRESSION_FIELDS_FIELD_NAME } from '../constants/fields';
import * as i18n from './translations';

interface SuppressionFieldsSelectorProps {
  suppressibleFields: DataViewFieldBase[];
  labelAppend?: React.ReactNode;
  disabled?: boolean;
}

export function SuppressionFieldsSelector({
  suppressibleFields,
  labelAppend,
  disabled,
}: SuppressionFieldsSelectorProps): JSX.Element {
  return (
    <EuiFormRow
      data-test-subj="alertSuppressionInput"
      label={i18n.ALERT_SUPPRESSION_SUPPRESS_BY_FIELD_LABEL}
      labelAppend={labelAppend}
      helpText={i18n.ALERT_SUPPRESSION_SUPPRESS_BY_FIELD_HELP_TEXT}
    >
      <>
        <UseField
          path={ALERT_SUPPRESSION_FIELDS_FIELD_NAME}
          component={MultiSelectFieldsAutocomplete}
          componentProps={{
            browserFields: suppressibleFields,
            isDisabled: disabled,
          }}
        />
      </>
    </EuiFormRow>
  );
}
