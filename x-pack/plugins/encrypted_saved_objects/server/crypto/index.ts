/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  EncryptedSavedObjectsService,
  EncryptedSavedObjectTypeRegistration,
  descriptorToArray,
  SavedObjectDescriptor,
} from './encrypted_saved_objects_service';
export { EncryptionError } from './encryption_error';
export { EncryptedSavedObjectAttributesDefinition } from './encrypted_saved_object_type_definition';
export { EncryptionKeyRotationService } from './encryption_key_rotation_service';
