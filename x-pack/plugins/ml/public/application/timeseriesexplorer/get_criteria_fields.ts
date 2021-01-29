/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Updates criteria fields for API calls, e.g. getAnomaliesTableData
 * @param detectorIndex
 * @param entities
 */
export const getCriteriaFields = (detectorIndex: number, entities: Record<string, any>) => {
  // Only filter on the entity if the field has a value.
  const nonBlankEntities = entities.filter(
    (entity: { fieldValue: any }) => entity.fieldValue !== null
  );
  return [
    {
      fieldName: 'detector_index',
      fieldValue: detectorIndex,
    },
    ...nonBlankEntities,
  ];
};
