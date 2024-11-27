/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFormRow } from '@elastic/eui';
import type { DataViewBase } from '@kbn/es-query';
import { createOrNewEntryItem } from '../../../../common/components/threat_match/helpers';
import type { ThreatMapEntries } from '../../../../common/components/threat_match/types';
import { ThreatMatchComponent } from '../../../../common/components/threat_match';
import type { FieldHook } from '../../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../../shared_imports';

export const DEFAULT_THREAT_MAPPING_VALUE = [createOrNewEntryItem()];

interface ThreatMatchMappingFieldProps {
  field: FieldHook<ThreatMapEntries[]>;
  threatIndexPatterns: DataViewBase;
  indexPatterns: DataViewBase;
}

export function ThreatMatchMappingField({
  field,
  threatIndexPatterns,
  indexPatterns,
}: ThreatMatchMappingFieldProps): JSX.Element {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const { setValue } = field;

  const handleMappingChange = useCallback(
    (entryItems: ThreatMapEntries[]): void => {
      if (entryItems.length === 0) {
        setValue(DEFAULT_THREAT_MAPPING_VALUE);
        return;
      }

      setValue(entryItems);
    },
    [setValue]
  );

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
