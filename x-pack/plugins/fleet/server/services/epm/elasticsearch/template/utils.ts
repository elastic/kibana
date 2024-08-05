/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { USER_SETTINGS_TEMPLATE_SUFFIX } from '../../../../constants';

type TemplateBaseName = string;
type UserSettingsTemplateName = `${TemplateBaseName}${typeof USER_SETTINGS_TEMPLATE_SUFFIX}`;

export const isUserSettingsTemplate = (name: string): name is UserSettingsTemplateName =>
  name.endsWith(USER_SETTINGS_TEMPLATE_SUFFIX);

// For any `constant_keyword` fields in `newMappings` that don't have a `value`, access the same field in
// the `oldMappings` and fill in the value from there
export const fillConstantKeywordValues = (
  oldMappings: MappingTypeMapping,
  newMappings: MappingTypeMapping
) => {
  const filledMappings = JSON.parse(JSON.stringify(newMappings)) as MappingTypeMapping;
  const deepGet = (obj: any, keys: string[]) => keys.reduce((xs, x) => xs?.[x] ?? undefined, obj);

  const fillEmptyConstantKeywordFields = (mappings: unknown, currentPath: string[] = []) => {
    if (!mappings) return;
    for (const [key, potentialField] of Object.entries(mappings)) {
      const path = [...currentPath, key];
      if (typeof potentialField === 'object') {
        if (potentialField.type === 'constant_keyword' && potentialField.value === undefined) {
          const valueFromOldMappings = deepGet(oldMappings.properties, [...path, 'value']);
          if (valueFromOldMappings !== undefined) {
            potentialField.value = valueFromOldMappings;
          }
        } else if (potentialField.properties && typeof potentialField.properties === 'object') {
          fillEmptyConstantKeywordFields(potentialField.properties, [...path, 'properties']);
        }
      }
    }
  };

  fillEmptyConstantKeywordFields(filledMappings.properties);

  return filledMappings;
};
