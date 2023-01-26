/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import React, { memo } from 'react';
import {
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { CaseSeverity } from '../../../common/api';
import { SeveritySelector } from '../severity/selector';
import { SEVERITY_TITLE } from '../severity/translations';

interface Props {
  isLoading: boolean;
}

const SeverityFieldFormComponent = ({ isLoading }: { isLoading: boolean }) => {
  const { setFieldValue } = useFormContext();
  const [{ severity }] = useFormData({ watch: ['severity'] });
  const onSeverityChange = (newSeverity: CaseSeverity) => {
    setFieldValue('severity', newSeverity);
  };
  return (
    <EuiFormRow data-test-subj="caseSeverity" fullWidth={true} label={SEVERITY_TITLE}>
      <SeveritySelector
        isLoading={isLoading}
        isDisabled={isLoading}
        selectedSeverity={severity ?? CaseSeverity.LOW}
        onSeverityChange={onSeverityChange}
      />
    </EuiFormRow>
  );
};
SeverityFieldFormComponent.displayName = 'SeverityFieldForm';

const SeverityComponent: React.FC<Props> = ({ isLoading }) => (
  <UseField
    path={'severity'}
    component={SeverityFieldFormComponent}
    componentProps={{
      isLoading,
    }}
  />
);

SeverityComponent.displayName = 'SeverityComponent';

export const Severity = memo(SeverityComponent);
