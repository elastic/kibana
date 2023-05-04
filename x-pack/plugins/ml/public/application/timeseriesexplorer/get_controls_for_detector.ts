/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mlJobService } from '../services/job_service';
import { Entity } from './components/entity_control/entity_control';
import { JobId } from '../../../common/types/anomaly_detection_jobs';

/**
 * Extracts entities from the detector configuration
 */
export function getControlsForDetector(
  selectedDetectorIndex: number,
  selectedEntities: Record<string, any>,
  selectedJobId: JobId
): Entity[] {
  const selectedJob = mlJobService.getJob(selectedJobId);

  const entities: Entity[] = [];

  if (selectedJob === undefined) {
    return entities;
  }

  // Update the entity dropdown control(s) according to the partitioning fields for the selected detector.
  const detectorIndex = selectedDetectorIndex;
  const detector = selectedJob.analysis_config.detectors[detectorIndex];

  const entitiesState = selectedEntities;
  const partitionFieldName = detector?.partition_field_name;
  const overFieldName = detector?.over_field_name;
  const byFieldName = detector?.by_field_name;
  if (partitionFieldName !== undefined) {
    const partitionFieldValue = entitiesState?.[partitionFieldName] ?? null;
    entities.push({
      fieldType: 'partition_field',
      fieldName: partitionFieldName,
      fieldValue: partitionFieldValue,
    });
  }
  if (overFieldName !== undefined) {
    const overFieldValue = entitiesState?.[overFieldName] ?? null;
    entities.push({
      fieldType: 'over_field',
      fieldName: overFieldName,
      fieldValue: overFieldValue,
    });
  }

  // For jobs with by and over fields, don't add the 'by' field as this
  // field will only be added to the top-level fields for record type results
  // if it also an influencer over the bucket.
  if (byFieldName !== undefined && overFieldName === undefined) {
    const byFieldValue = entitiesState?.[byFieldName] ?? null;
    entities.push({ fieldType: 'by_field', fieldName: byFieldName, fieldValue: byFieldValue });
  }

  return entities;
}
