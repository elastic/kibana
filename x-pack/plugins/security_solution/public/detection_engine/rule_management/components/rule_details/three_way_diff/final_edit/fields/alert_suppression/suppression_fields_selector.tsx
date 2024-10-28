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
import * as i18n from './translations';

interface SuppressionFieldsSelectorProps {
  supportedFieldSpecs: DataViewFieldBase[];
  disabled?: boolean;
  disabledText?: string;
}

export function SuppressionFieldsSelector({
  supportedFieldSpecs,
  disabled,
  disabledText,
}: SuppressionFieldsSelectorProps): JSX.Element {
  return (
    <>
      <EuiFormRow
        data-test-subj="alertSuppressionInput"
        label={i18n.GROUP_BY_LABEL}
        labelAppend={
          <EuiText color="subdued" size="xs">
            {i18n.OPTIONAL}
          </EuiText>
        }
      >
        <>
          <UseField
            path="groupByFields"
            component={MultiSelectFieldsAutocomplete}
            componentProps={{
              browserFields: supportedFieldSpecs,
              isDisabled: disabled,
              disabledText,
            }}
          />
        </>
      </EuiFormRow>
    </>
  );
}
