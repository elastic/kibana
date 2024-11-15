/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { EuiFormRow } from '@elastic/eui';
import type { DataViewBase } from '@kbn/es-query';
import type { ThreatMapEntries } from '../../../../common/components/threat_match/types';
import { ThreatMatchComponent } from '../../../../common/components/threat_match';
import type { FieldHook } from '../../../../shared_imports';
import { UseField, getFieldValidityAndErrorMessage } from '../../../../shared_imports';

interface ThreatMatchEditProps {
  path: string;
  threatIndexPatterns: DataViewBase;
  indexPatterns: DataViewBase;
  onValidityChange?: (isValid: boolean) => void;
}

export const ThreatMatchEdit = memo(function ThreatMatchEdit({
  path,
  indexPatterns,
  threatIndexPatterns,
  onValidityChange,
}: ThreatMatchEditProps): JSX.Element {
  const componentProps = {
    indexPatterns,
    threatIndexPatterns,
    onValidityChange,
  };

  return <UseField path={path} component={ThreatMatchField} componentProps={componentProps} />;
});

interface ThreatMatchFieldProps {
  field: FieldHook<ThreatMapEntries[]>;
  threatIndexPatterns: DataViewBase;
  indexPatterns: DataViewBase;
  onValidityChange?: (isValid: boolean) => void;
}

function ThreatMatchField({
  field,
  threatIndexPatterns,
  indexPatterns,
  onValidityChange,
}: ThreatMatchFieldProps): JSX.Element {
  const { isInvalid: isThreatMappingInvalid, errorMessage } =
    getFieldValidityAndErrorMessage(field);
  const [isThreatIndexPatternValid, setIsThreatIndexPatternValid] = useState(false);

  useEffect(() => {
    if (onValidityChange) {
      onValidityChange(!isThreatMappingInvalid && isThreatIndexPatternValid);
    }
  }, [isThreatIndexPatternValid, isThreatMappingInvalid, onValidityChange]);

  const handleBuilderOnChange = useCallback(
    ({ entryItems }: { entryItems: ThreatMapEntries[] }): void => {
      field.setValue(entryItems);
    },
    [field]
  );

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isThreatMappingInvalid}
      fullWidth
    >
      <ThreatMatchComponent
        listItems={field.value}
        indexPatterns={indexPatterns}
        threatIndexPatterns={threatIndexPatterns}
        data-test-subj="threatmatch-builder"
        id-aria="threatmatch-builder"
        onChange={handleBuilderOnChange}
      />
    </EuiFormRow>
  );
}
