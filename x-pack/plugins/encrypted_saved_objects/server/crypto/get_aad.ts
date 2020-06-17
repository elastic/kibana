/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import stringify from 'json-stable-stringify';
import { Logger } from 'src/core/server';
import { EncryptedSavedObjectAttributesDefinition } from './encrypted_saved_object_type_definition';
import { SavedObjectDescriptor, descriptorToArray } from './encrypted_saved_objects_service';

/**
 * Generates string representation of the Additional Authenticated Data based on the specified saved
 * object type and attributes.
 * @param typeDefinition Encrypted saved object type definition.
 * @param descriptor Descriptor of the saved object to get AAD for.
 * @param attributes All attributes of the saved object instance of the specified type.
 */
export function getAAD(
  typeDefinition: EncryptedSavedObjectAttributesDefinition,
  descriptor: SavedObjectDescriptor,
  attributes: Record<string, unknown>,
  logger: Logger
) {
  // Collect all attributes (both keys and values) that should contribute to AAD.
  const attributesAAD: Record<string, unknown> = {};
  for (const [attributeKey, attributeValue] of Object.entries(attributes)) {
    if (!typeDefinition.shouldBeExcludedFromAAD(attributeKey)) {
      attributesAAD[attributeKey] = attributeValue;
    }
  }

  if (Object.keys(attributesAAD).length === 0) {
    logger.debug(
      `The AAD for saved object "${descriptorToArray(descriptor)}" does not include any attributes.`
    );
  }

  return stringify([...descriptorToArray(descriptor), attributesAAD]);
}
