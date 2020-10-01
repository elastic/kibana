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
import { SignalSource } from '../types';

interface BuildSeverityFromMappingProps {
  eventSource: SignalSource;
  severity: Severity;
  severityMapping: SeverityMappingOrUndefined;
}

interface BuildSeverityFromMappingReturn {
  severity: Severity;
  severityMeta: Meta; // TODO: Stricter types
}

const severitySortMapping = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export const buildSeverityFromMapping = ({
  eventSource,
  severity,
  severityMapping,
}: BuildSeverityFromMappingProps): BuildSeverityFromMappingReturn => {
  if (severityMapping != null && severityMapping.length > 0) {
    let severityMatch: SeverityMappingItem | undefined;

    // Sort the SeverityMapping from low to high, so last match (highest severity) is used
    const severityMappingSorted = severityMapping.sort(
      (a, b) => severitySortMapping[a.severity] - severitySortMapping[b.severity]
    );

    severityMappingSorted.forEach((mapping) => {
      const docValue = get(mapping.field, eventSource);
      // TODO: Expand by verifying fieldType from index via doc._index
      // Till then, explicit parsing of event.severity (long) to number. If not ECS, this could be
      // another datatype, but until we can lookup datatype we must assume number for the Elastic
      // Endpoint Security rule to function correctly
      let parsedMappingValue: string | number = mapping.value;
      if (mapping.field === 'event.severity') {
        parsedMappingValue = Math.floor(Number(parsedMappingValue));
      }

      if (parsedMappingValue === docValue) {
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
