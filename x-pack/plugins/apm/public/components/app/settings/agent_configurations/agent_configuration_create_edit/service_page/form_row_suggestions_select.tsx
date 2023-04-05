/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { SuggestionsSelect } from '../../../../../shared/suggestions_select';
import {
  getOptionLabel,
  ALL_OPTION,
} from '../../../../../../../common/agent_configuration/all_option';

interface Props {
  title: string;
  fieldName: string;
  description: string;
  fieldLabel: string;
  value?: string;
  allowAll?: boolean;
  onChange: (value?: string) => void;
  dataTestSubj?: string;
  isInvalid?: boolean;
  error?: ReactNode | ReactNode[];
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
  isInvalid,
  error,
}: Props) {
  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h3>{title}</h3>}
      description={description}
    >
      <EuiFormRow label={fieldLabel} isInvalid={isInvalid} error={error}>
        <SuggestionsSelect
          customOptions={allowAll ? [ALL_OPTION] : undefined}
          defaultValue={value ? getOptionLabel(value) : undefined}
          fieldName={fieldName}
          onChange={onChange}
          isClearable={false}
          placeholder={i18n.translate(
            'xpack.apm.agentConfig.servicePage.service.placeholder',
            { defaultMessage: 'Select Option' }
          )}
          dataTestSubj={dataTestSubj}
          start={moment().subtract(24, 'h').toISOString()}
          end={moment().toISOString()}
          isInvalid={isInvalid}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
}
