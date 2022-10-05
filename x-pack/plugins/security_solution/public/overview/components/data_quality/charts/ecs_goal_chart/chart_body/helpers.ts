/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasValidTimestampMapping } from '../../../helpers';
import type { PartitionedFieldMetadata } from '../../../types';

export const MIN_ROTATE = -219;
export const MAX_ROTATE = 43;
export const BETWEEN_NOT_ECS_AND_NON_ECS = -134;
export const PARTIAL_NON_ECS_ROTATE = -104;
export const PARTIAL_ECS_COMPLIANT_ROTATE = -6;

export const hasNotECSCompliantFields = (
  partitionedFieldMetadata: PartitionedFieldMetadata
): boolean => partitionedFieldMetadata.notEcsCompliant.length > 0;

export const hasNonEcsFields = (partitionedFieldMetadata: PartitionedFieldMetadata): boolean =>
  partitionedFieldMetadata.nonEcs.length > 0;

export const hasECSCompliantFields = (
  partitionedFieldMetadata: PartitionedFieldMetadata
): boolean => partitionedFieldMetadata.ecsCompliant.length > 0;

export const getRotation = (partitionedFieldMetadata: PartitionedFieldMetadata): number => {
  if (!hasValidTimestampMapping(partitionedFieldMetadata.ecsCompliant)) {
    return MIN_ROTATE; // the index must at least have an @timestamp
  }

  if (
    hasNotECSCompliantFields(partitionedFieldMetadata) &&
    !hasNonEcsFields(partitionedFieldMetadata)
  ) {
    return BETWEEN_NOT_ECS_AND_NON_ECS;
  } else if (
    hasNotECSCompliantFields(partitionedFieldMetadata) &&
    hasNonEcsFields(partitionedFieldMetadata)
  ) {
    return PARTIAL_NON_ECS_ROTATE;
  } else if (
    hasNonEcsFields(partitionedFieldMetadata) &&
    hasECSCompliantFields(partitionedFieldMetadata)
  ) {
    return PARTIAL_ECS_COMPLIANT_ROTATE;
  } else {
    return MAX_ROTATE;
  }
};
