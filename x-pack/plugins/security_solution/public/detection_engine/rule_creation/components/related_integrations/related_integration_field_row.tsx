/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { RelatedIntegration } from '../../../../../common/api/detection_engine';
import type { ArrayItem, FieldConfig } from '../../../../shared_imports';
import { FIELD_TYPES, UseField } from '../../../../shared_imports';
import { DEFAULT_RELATED_INTEGRATION } from './default_related_integration';
import { RelatedIntegrationField } from './related_integration_field';
import { validateRelatedIntegration } from './validate_related_integration';

interface RelatedIntegrationFieldRowProps {
  item: ArrayItem;
  relatedIntegrations: RelatedIntegration[];
  removeItem: (id: number) => void;
}

export function RelatedIntegrationFieldRow({
  item,
  relatedIntegrations,
  removeItem,
}: RelatedIntegrationFieldRowProps): JSX.Element {
  const handleRemove = useCallback(() => removeItem(item.id), [removeItem, item.id]);

  return (
    <UseField
      key={item.id}
      path={item.path}
      config={RELATED_INTEGRATION_FIELD_CONFIG}
      component={RelatedIntegrationField}
      readDefaultValueOnForm={!item.isNew}
      componentProps={{
        relatedIntegrations,
        onRemove: handleRemove,
      }}
    />
  );
}

const RELATED_INTEGRATION_FIELD_CONFIG: FieldConfig<RelatedIntegration, RelatedIntegration> = {
  type: FIELD_TYPES.JSON,
  validations: [{ validator: validateRelatedIntegration }],
  defaultValue: DEFAULT_RELATED_INTEGRATION,
};
