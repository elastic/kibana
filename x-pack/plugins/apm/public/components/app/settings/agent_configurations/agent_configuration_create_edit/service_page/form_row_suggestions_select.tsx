/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { SuggestionsSelect } from '../../../../../shared/suggestions_select';
import { ENVIRONMENT_ALL } from '../../../../../../../common/environment_filter_values';

interface Props {
  title: string;
  fieldName: string;
  description: string;
  fieldLabel: string;
  value?: string;
  allowAll?: boolean;
  onChange: (value?: string) => void;
  dataTestSubj?: string;
}

export function FormRowSuggestionsSelect({
  title,
  fieldName,
  description,
  fieldLabel,
  value,
  allowAll = true,
  onChange,
  dataTestSubj,
}: Props) {
  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h3>{title}</h3>}
      description={description}
    >
      <EuiFormRow label={fieldLabel}>
        <SuggestionsSelect
          customOptions={allowAll ? [ENVIRONMENT_ALL] : undefined}
          defaultValue={value}
          fieldName={fieldName}
          onChange={onChange}
          isClearable={false}
          placeholder={i18n.translate(
            'xpack.apm.agentConfig.servicePage.service.placeholder',
            { defaultMessage: 'Select Option' }
          )}
          dataTestSubj={dataTestSubj}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
}
