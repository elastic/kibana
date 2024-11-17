/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { EuiFormRow } from '@elastic/eui';
import type { DataViewBase } from '@kbn/es-query';
import { createOrNewEntryItem } from '../../../../common/components/threat_match/helpers';
import type { ThreatMapEntries } from '../../../../common/components/threat_match/types';
import { ThreatMatchComponent } from '../../../../common/components/threat_match';
import type { FieldHook } from '../../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../../shared_imports';

interface ThreatMatchFieldProps {
  field: FieldHook<ThreatMapEntries[]>;
  threatIndexPatterns: DataViewBase;
  indexPatterns: DataViewBase;
}

export function ThreatMatchField({
  field,
  threatIndexPatterns,
  indexPatterns,
}: ThreatMatchFieldProps): JSX.Element {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const { value, setValue, clearErrors } = field;

  const handleMappingChange = useCallback(
    (entryItems: ThreatMapEntries[]): void => {
      if (entryItems.length === 0) {
        setValue(DEFAULT_VALUE);
        return;
      }

      setValue(entryItems);
    },
    [setValue]
  );

  useEffect(() => {
    if (!Array.isArray(value) || value.length === 0) {
      setValue(DEFAULT_VALUE);

      // Avoid showing validation errors when setting default value
      // Since Form Hook's validation is async setTimeout is required
      // to clear error after validation
      setTimeout(() => {
        clearErrors();
      });
    }
  }, [value, setValue, clearErrors]);

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
    >
      <ThreatMatchComponent
        mappingEntries={field.value}
        indexPatterns={indexPatterns}
        threatIndexPatterns={threatIndexPatterns}
        data-test-subj="ruleThreatMatchMappingField"
        id-aria="ruleThreatMatchMappingField"
        onMappingEntriesChange={handleMappingChange}
      />
    </EuiFormRow>
  );
}

const DEFAULT_VALUE = [createOrNewEntryItem()];
