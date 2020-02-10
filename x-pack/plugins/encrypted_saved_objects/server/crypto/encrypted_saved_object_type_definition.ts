/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EncryptedSavedObjectTypeRegistration } from './encrypted_saved_objects_service';

export class EncryptedSavedObjectTypeDefinition {
  public readonly attributesToEncrypt: ReadonlySet<string>;
  public readonly attributesToExcludeFromAAD: ReadonlySet<string> | undefined;
  public readonly attributesToStrip: ReadonlySet<string>;
  constructor(typeRegistration: EncryptedSavedObjectTypeRegistration) {
    const attributesToEncrypt = new Set<string>();
    const attributesToStrip = new Set<string>();
    for (const attribute of typeRegistration.attributesToEncrypt) {
      if (typeof attribute === 'string') {
        attributesToEncrypt.add(attribute);
        attributesToStrip.add(attribute);
      } else {
        attributesToEncrypt.add(attribute.key);
        if (!attribute.dangerouslyExposeValue) {
          attributesToStrip.add(attribute.key);
        }
      }
    }
    this.attributesToEncrypt = attributesToEncrypt;
    this.attributesToExcludeFromAAD = typeRegistration.attributesToExcludeFromAAD;
    this.attributesToStrip = attributesToStrip;
  }
}
