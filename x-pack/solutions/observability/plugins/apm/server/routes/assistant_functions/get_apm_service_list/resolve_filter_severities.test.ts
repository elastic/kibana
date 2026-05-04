/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { ServiceHealthStatus } from '../../../../common/service_health_status';
import {
  mlSeveritiesForLegacyHealthFilter,
  resolveFilterSeverities,
} from './resolve_filter_severities';

function sortedSeverities(severities: ML_ANOMALY_SEVERITY[]) {
  return [...severities].sort((a, b) => a.localeCompare(b));
}

describe('mlSeveritiesForLegacyHealthFilter', () => {
  it('maps critical to CRITICAL and MAJOR (not UNKNOWN)', () => {
    const result = mlSeveritiesForLegacyHealthFilter([ServiceHealthStatus.critical]);
    expect(sortedSeverities(result)).toEqual(
      sortedSeverities([ML_ANOMALY_SEVERITY.CRITICAL, ML_ANOMALY_SEVERITY.MAJOR])
    );
    expect(result).not.toContain(ML_ANOMALY_SEVERITY.UNKNOWN);
  });

  it('maps healthy to LOW only (not UNKNOWN)', () => {
    const result = mlSeveritiesForLegacyHealthFilter([ServiceHealthStatus.healthy]);
    expect(result).toEqual([ML_ANOMALY_SEVERITY.LOW]);
    expect(result).not.toContain(ML_ANOMALY_SEVERITY.UNKNOWN);
  });

  it('maps warning to MINOR and WARNING', () => {
    const result = mlSeveritiesForLegacyHealthFilter([ServiceHealthStatus.warning]);
    expect(sortedSeverities(result)).toEqual(
      sortedSeverities([ML_ANOMALY_SEVERITY.MINOR, ML_ANOMALY_SEVERITY.WARNING])
    );
  });

  it('maps unknown to UNKNOWN', () => {
    const result = mlSeveritiesForLegacyHealthFilter([ServiceHealthStatus.unknown]);
    expect(result).toEqual([ML_ANOMALY_SEVERITY.UNKNOWN]);
  });

  it('dedupes when multiple legacy statuses expand to overlapping ML severities', () => {
    const result = mlSeveritiesForLegacyHealthFilter([
      ServiceHealthStatus.critical,
      ServiceHealthStatus.critical,
    ]);
    expect(result).toHaveLength(2);
    expect(sortedSeverities(result)).toEqual(
      sortedSeverities([ML_ANOMALY_SEVERITY.CRITICAL, ML_ANOMALY_SEVERITY.MAJOR])
    );
  });

  it('unions severities for combined legacy filters', () => {
    const result = mlSeveritiesForLegacyHealthFilter([
      ServiceHealthStatus.critical,
      ServiceHealthStatus.healthy,
    ]);
    expect(sortedSeverities(result)).toEqual(
      sortedSeverities([
        ML_ANOMALY_SEVERITY.CRITICAL,
        ML_ANOMALY_SEVERITY.MAJOR,
        ML_ANOMALY_SEVERITY.LOW,
      ])
    );
  });
});

describe('resolveFilterSeverities', () => {
  it('prefers mlSeverities when non-empty', () => {
    const mlSeverities = [ML_ANOMALY_SEVERITY.MINOR];
    expect(
      resolveFilterSeverities({
        mlSeverities,
        healthStatus: [ServiceHealthStatus.critical],
      })
    ).toBe(mlSeverities);
  });

  it('falls back to legacy health mapping when mlSeverities is empty', () => {
    expect(
      resolveFilterSeverities({
        mlSeverities: [],
        healthStatus: [ServiceHealthStatus.healthy],
      })
    ).toEqual([ML_ANOMALY_SEVERITY.LOW]);
  });

  it('returns undefined when neither filter is provided', () => {
    expect(resolveFilterSeverities({})).toBeUndefined();
  });

  it('returns undefined when healthStatus is empty', () => {
    expect(resolveFilterSeverities({ healthStatus: [] })).toBeUndefined();
  });
});
