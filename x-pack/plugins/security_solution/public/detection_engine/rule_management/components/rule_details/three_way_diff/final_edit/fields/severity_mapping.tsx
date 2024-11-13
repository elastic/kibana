/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { DataViewFieldBase } from '@kbn/es-query';
import { type FieldHook, type FormData, UseField } from '../../../../../../../shared_imports';
import type {
  DiffableRule,
  Severity,
  SeverityMapping,
} from '../../../../../../../../common/api/detection_engine';
import { SeverityOverride } from '../../../../../../rule_creation_ui/components/severity_mapping/severity_override';
import { useDefaultIndexPattern } from '../../../../../hooks/use_default_index_pattern';
import { getUseRuleIndexPatternParameters } from '../utils';
import { useRuleIndexPattern } from '../../../../../../rule_creation_ui/pages/form';
import { fillEmptySeverityMappings } from '../../../../../../../detections/pages/detection_engine/rules/helpers';
import { filterOutEmptySeverityMappingItems } from '../../../../../../rule_creation_ui/pages/rule_creation/helpers';

interface SeverityMappingEditProps {
  finalDiffableRule: DiffableRule;
}

export function SeverityMappingEdit({ finalDiffableRule }: SeverityMappingEditProps): JSX.Element {
  return (
    <UseField
      path="severityMapping"
      component={SeverityMappingField}
      componentProps={{
        finalDiffableRule,
      }}
    />
  );
}

interface SeverityMappingFieldProps {
  field: FieldHook<{
    isMappingChecked: boolean;
    mapping: SeverityMapping;
  }>;
  finalDiffableRule: DiffableRule;
}

function SeverityMappingField({ field, finalDiffableRule }: SeverityMappingFieldProps) {
  const defaultIndexPattern = useDefaultIndexPattern();
  const indexPatternParameters = getUseRuleIndexPatternParameters(
    finalDiffableRule,
    defaultIndexPattern
  );
  const { indexPattern, isIndexPatternLoading } = useRuleIndexPattern(indexPatternParameters);

  const { value, setValue } = field;

  const handleFieldChange = useCallback(
    (index: number, severity: Severity, [newField]: DataViewFieldBase[]): void => {
      setValue((prevValue) => {
        const newMappingItem: SeverityMapping = [
          {
            ...prevValue.mapping[index],
            field: newField?.name ?? '',
            value: newField != null ? prevValue.mapping[index].value : '',
            operator: 'equals',
            severity,
          },
        ];

        return {
          ...prevValue,
          mapping: [
            ...prevValue.mapping.slice(0, index),
            ...newMappingItem,
            ...prevValue.mapping.slice(index + 1),
          ],
        };
      });
    },
    [setValue]
  );

  const handleFieldMatchValueChange = useCallback(
    (index: number, severity: Severity, newMatchValue: string): void => {
      setValue((prevValue) => {
        const newMappingItem: SeverityMapping = [
          {
            ...prevValue.mapping[index],
            field: prevValue.mapping[index].field,
            value:
              prevValue.mapping[index].field != null && prevValue.mapping[index].field !== ''
                ? newMatchValue
                : '',
            operator: 'equals',
            severity,
          },
        ];

        return {
          ...prevValue,
          mapping: [
            ...prevValue.mapping.slice(0, index),
            ...newMappingItem,
            ...prevValue.mapping.slice(index + 1),
          ],
        };
      });
    },
    [setValue]
  );

  const handleSeverityMappingChecked = useCallback(() => {
    setValue((prevValue) => ({
      ...prevValue,
      isMappingChecked: !prevValue.isMappingChecked,
    }));
  }, [setValue]);

  return (
    <SeverityOverride
      isDisabled={isIndexPatternLoading}
      onSeverityMappingChecked={handleSeverityMappingChecked}
      onFieldChange={handleFieldChange}
      onFieldMatchValueChange={handleFieldMatchValueChange}
      isMappingChecked={value.isMappingChecked}
      mapping={value.mapping}
      indices={indexPattern}
    />
  );
}

export function severityMappingDeserializer(defaultValue: FormData) {
  return {
    severityMapping: {
      isMappingChecked: defaultValue.severity_mapping.length > 0,
      mapping: fillEmptySeverityMappings(defaultValue.severity_mapping as SeverityMapping),
    },
  };
}

export function severityMappingSerializer(formData: FormData): {
  severity_mapping: SeverityMapping;
} {
  return {
    severity_mapping: formData.severityMapping.isMappingChecked
      ? filterOutEmptySeverityMappingItems(formData.severityMapping.mapping)
      : [],
  };
}
