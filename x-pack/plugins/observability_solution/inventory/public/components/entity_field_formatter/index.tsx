/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FieldFormat,
  FieldFormatsContentType,
  HtmlContextTypeOptions,
  TextContextTypeOptions,
} from '@kbn/field-formats-plugin/common';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { castArray } from 'lodash';
import { CoreSetup } from '@kbn/core/public';
import type { InventoryAPIClient } from '../../api';
import { InventoryEntityDefinition } from '../../../common/entities';

export function createEntityFieldFormatterClass({
  inventoryAPIClient,
  coreSetup,
}: {
  inventoryAPIClient: InventoryAPIClient;
  coreSetup: CoreSetup;
}) {
  const typeByField = new Map<string, string>();

  const definitionsByType = new Map<string, InventoryEntityDefinition>();

  inventoryAPIClient
    .fetch('GET /internal/inventory/entities/definition/inventory', {
      signal: new AbortController().signal,
    })
    .then((response) => {
      response.definitions.forEach((definition) => {
        definitionsByType.set(definition.definitionType, definition);
        definition.identityFields?.forEach(({ field }) => {
          typeByField.set(field, definition.definitionType);
        });
      });
    });

  return class EntityFieldFormatter extends FieldFormat {
    static id = 'entity-field';
    static title = 'Entity links';

    // 2. Specify field types that this formatter supports
    static fieldType = KBN_FIELD_TYPES.STRING;

    override convert(
      value: unknown,
      contentType?: FieldFormatsContentType,
      options?: HtmlContextTypeOptions | TextContextTypeOptions | undefined
    ): string {
      if (options && 'field' in options && typeof value === 'string') {
        const fieldName = options.field?.name ?? '';
        const entityType = typeByField.get(fieldName);
        if (entityType) {
          const definition = definitionsByType.get(entityType)!;

          if (definition.identityFields.find((field) => field.field === fieldName)) {
            const items = castArray(value).map((valueAtIndex) => {
              const id = valueAtIndex;
              return `<a href="${coreSetup.http.basePath.prepend(
                `/app/observability/entities/${encodeURIComponent(
                  definition.definitionType ?? ''
                )}/${id}`
              )}">${valueAtIndex}</a>`;
            });

            if (items.length === 1) {
              return items[0];
            }
            return `[ ${items.join(',')} ]`;
          }
        }
      }
      return super.convert(value, contentType, options);
    }
  };
}
