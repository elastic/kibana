/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';

import type {
  RuleMetadata,
  SeverityMapping,
  SeverityMappingItem,
} from '../../../../../common/detection_engine/rule_schema';
import { Severity } from '../../../../../common/detection_engine/rule_schema';
import type { SearchTypes } from '../../../../../common/detection_engine/types';
import type { SignalSource } from '../types';

export interface BuildSeverityFromMappingProps {
  eventSource: SignalSource;
  severity: Severity;
  severityMapping: SeverityMapping | undefined;
}

export interface BuildSeverityFromMappingReturn {
  severity: Severity;
  severityMeta: RuleMetadata; // TODO: Stricter types
}

const severitySortMapping = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const ECS_SEVERITY_FIELD = 'event.severity';

export const buildSeverityFromMapping = ({
  eventSource,
  severity,
  severityMapping,
}: BuildSeverityFromMappingProps): BuildSeverityFromMappingReturn => {
  if (!severityMapping || !severityMapping.length) {
    return defaultSeverity(severity);
  }

  let severityMatch: SeverityMappingItem | undefined;

  // Sort the SeverityMapping from low to high, so last match (highest severity) is used
  const severityMappingSorted = severityMapping.sort(
    (a, b) => severitySortMapping[a.severity] - severitySortMapping[b.severity]
  );

  severityMappingSorted.forEach((mapping) => {
    const mappingField = mapping.field;
    const mappingValue = mapping.value;
    const eventValue = get(mappingField, eventSource);

    const normalizedEventValues = normalizeEventValue(mappingField, eventValue);
    const normalizedMappingValue = normalizeMappingValue(mappingField, mappingValue);

    if (normalizedEventValues.has(normalizedMappingValue)) {
      severityMatch = { ...mapping };
    }
  });

  if (severityMatch != null && Severity.is(severityMatch.severity)) {
    return overriddenSeverity(severityMatch.severity, severityMatch.field);
  }

  return defaultSeverity(severity);
};

function normalizeMappingValue(eventField: string, mappingValue: string): string | number {
  // TODO: Expand by verifying fieldType from index via doc._index
  // Till then, explicit parsing of event.severity (long) to number. If not ECS, this could be
  // another datatype, but until we can lookup datatype we must assume number for the Elastic
  // Endpoint Security rule to function correctly
  if (eventField === ECS_SEVERITY_FIELD) {
    return Math.floor(Number(mappingValue));
  }

  return mappingValue;
}

function normalizeEventValue(eventField: string, eventValue: SearchTypes): Set<string | number> {
  const eventValues = Array.isArray(eventValue) ? eventValue : [eventValue];
  const validValues = eventValues.filter((v): v is string | number => isValidValue(eventField, v));
  const finalValues = eventField === ECS_SEVERITY_FIELD ? validValues : validValues.map(String);
  return new Set(finalValues);
}

function isValidValue(eventField: string, value: unknown): value is string | number {
  return eventField === ECS_SEVERITY_FIELD
    ? isValidNumber(value)
    : isValidNumber(value) || isValidString(value);
}

function isValidString(value: unknown): value is string {
  return typeof value === 'string';
}

function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function defaultSeverity(value: Severity): BuildSeverityFromMappingReturn {
  return {
    severity: value,
    severityMeta: {},
  };
}

function overriddenSeverity(value: Severity, field: string): BuildSeverityFromMappingReturn {
  return {
    severity: value,
    severityMeta: {
      severityOverrideField: field,
    },
  };
}
