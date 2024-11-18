/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../../../../../../common/api/entity_analytics/entity_store';
import { getIdentityFieldForEntityType } from '../../utils';
import { oldestValue, newestValue } from '../definition_utils';
import type { UnitedDefinitionField } from '../types';

export const getCommonUnitedFieldDefinitions = ({
  entityType,
  fieldHistoryLength,
}: {
  entityType: EntityType;
  fieldHistoryLength: number;
}): UnitedDefinitionField[] => {
  const identityField = getIdentityFieldForEntityType(entityType);
  return [
    oldestValue({
      sourceField: '_index',
      field: 'entity.source',
    }),
    newestValue({ field: 'asset.criticality' }),
    newestValue({
      field: `${entityType}.risk.calculated_level`,
    }),
    newestValue({
      field: `${entityType}.risk.calculated_score`,
      mapping: {
        type: 'float',
      },
    }),
    newestValue({
      field: `${entityType}.risk.calculated_score_norm`,
      mapping: {
        type: 'float',
      },
    }),
    {
      field: identityField,
    },
  ];
};
