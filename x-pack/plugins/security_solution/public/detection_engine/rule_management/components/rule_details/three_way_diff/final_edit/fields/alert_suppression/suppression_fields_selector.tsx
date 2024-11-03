/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiText } from '@elastic/eui';
import type { DataViewFieldBase } from '@kbn/es-query';
import { UseField } from '../../../../../../../../shared_imports';
import { MultiSelectFieldsAutocomplete } from '../../../../../../../rule_creation_ui/components/multi_select_fields';
import { SUPPRESSION_FIELDS } from './form_schema';
import * as i18n from './translations';

interface SuppressionFieldsSelectorProps {
  suppressibleFieldSpecs: DataViewFieldBase[];
  disabled?: boolean;
}

export function SuppressionFieldsSelector({
  suppressibleFieldSpecs,
  disabled,
}: SuppressionFieldsSelectorProps): JSX.Element {
  return (
    <EuiFormRow
      data-test-subj="alertSuppressionInput"
      label={i18n.ALERT_SUPPRESSION_SUPPRESS_BY_FIELD_LABEL}
      labelAppend={
        <EuiText color="subdued" size="xs">
          {i18n.OPTIONAL}
        </EuiText>
      }
    >
      <>
        <UseField
          path={SUPPRESSION_FIELDS}
          component={MultiSelectFieldsAutocomplete}
          componentProps={{
            browserFields: suppressibleFieldSpecs,
            isDisabled: disabled,
          }}
        />
      </>
    </EuiFormRow>
  );
}
