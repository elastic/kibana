/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash/fp';
import {
  Meta,
  Severity,
  SeverityMappingItem,
  severity as SeverityIOTS,
  SeverityMappingOrUndefined,
} from '../../../../../common/detection_engine/schemas/common/schemas';
import { SignalSourceHit } from '../types';

interface BuildSeverityFromMappingProps {
  doc: SignalSourceHit;
  severity: Severity;
  severityMapping: SeverityMappingOrUndefined;
}

interface BuildSeverityFromMappingReturn {
  severity: Severity;
  severityMeta: Meta; // TODO: Stricter types
}

export const buildSeverityFromMapping = ({
  doc,
  severity,
  severityMapping,
}: BuildSeverityFromMappingProps): BuildSeverityFromMappingReturn => {
  if (severityMapping != null && severityMapping.length > 0) {
    let severityMatch: SeverityMappingItem | undefined;
    severityMapping.forEach((mapping) => {
      // TODO: Expand by verifying fieldType from index via  doc._index
      const mappedValue = get(mapping.field, doc._source);
      if (mapping.value === mappedValue) {
        severityMatch = { ...mapping };
      }
    });

    if (severityMatch != null && SeverityIOTS.is(severityMatch.severity)) {
      return {
        severity: severityMatch.severity,
        severityMeta: { severityOverrideField: severityMatch.field },
      };
    }
  }
  return { severity, severityMeta: {} };
};
