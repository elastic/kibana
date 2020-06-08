/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as runtimeTypes from 'io-ts';
import {
  SavedObjectAttributes,
  SavedObjectAttribute,
  SavedObjectAttributeSingle,
} from 'kibana/public';

export const SavedObjectAttributeSingleRuntimeType: runtimeTypes.Type<SavedObjectAttributeSingle> = runtimeTypes.recursion(
  'saved_object_attribute_single',
  () =>
    runtimeTypes.union([
      runtimeTypes.string,
      runtimeTypes.number,
      runtimeTypes.boolean,
      runtimeTypes.null,
      runtimeTypes.undefined,
      SavedObjectAttributesRuntimeType,
    ])
);
export const SavedObjectAttributeRuntimeType: runtimeTypes.Type<SavedObjectAttribute> = runtimeTypes.recursion(
  'saved_object_attribute',
  () =>
    runtimeTypes.union([
      SavedObjectAttributeSingleRuntimeType,
      runtimeTypes.array(SavedObjectAttributeSingleRuntimeType),
    ])
);
export const SavedObjectAttributesRuntimeType: runtimeTypes.Type<SavedObjectAttributes> = runtimeTypes.recursion(
  'saved_object_attributes',
  () => runtimeTypes.record(runtimeTypes.string, SavedObjectAttributeRuntimeType)
);
