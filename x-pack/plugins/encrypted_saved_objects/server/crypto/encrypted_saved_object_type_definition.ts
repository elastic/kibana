/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EncryptedSavedObjectTypeRegistration } from './encrypted_saved_objects_service';

/**
 * Represents the definition of the attributes of the specific saved object that are supposed to be
 * encrypted. The definition also dictates which attributes should be excluded from AAD and/or
 * stripped from response.
 */
export class EncryptedSavedObjectAttributesDefinition {
  public readonly attributesToEncrypt: ReadonlySet<string>;
  private readonly attributesToExcludeFromAAD: ReadonlySet<string> | undefined;
  private readonly attributesToStrip: ReadonlySet<string>;

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
    this.attributesToStrip = attributesToStrip;
    this.attributesToExcludeFromAAD = typeRegistration.attributesToExcludeFromAAD;
  }

  /**
   * Determines whether particular attribute should be encrypted. Full list of attributes that
   * should be encrypted can be retrieved via `attributesToEncrypt` property.
   * @param attributeName Name of the attribute.
   */
  public shouldBeEncrypted(attributeName: string) {
    return this.attributesToEncrypt.has(attributeName);
  }

  /**
   * Determines whether particular attribute should be excluded from AAD.
   * @param attributeName Name of the attribute.
   */
  public shouldBeExcludedFromAAD(attributeName: string) {
    return (
      this.shouldBeEncrypted(attributeName) ||
      (this.attributesToExcludeFromAAD != null &&
        this.attributesToExcludeFromAAD.has(attributeName))
    );
  }

  /**
   * Determines whether particular attribute should be stripped from the attribute list.
   * @param attributeName Name of the attribute.
   */
  public shouldBeStripped(attributeName: string) {
    return this.attributesToStrip.has(attributeName);
  }
}
