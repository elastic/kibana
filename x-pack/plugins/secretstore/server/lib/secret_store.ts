/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import { SavedObjectsClient } from 'src/server/saved_objects';
import { buildCrypt } from './crypt_keeper';

export class SecretStore {
  public readonly hideAttribute: (deets: any, secretKey: string) => any;
  public readonly unhideAttribute: (deets: any) => any;
  private readonly type: string;

  constructor(savedObjectsClient: SavedObjectsClient, type: string, key?: Buffer) {
    this.type = type;
    key = key || crypto.randomBytes(128);
    const crypt = buildCrypt({ key: key.toString('hex') });

    this.hideAttribute = async (deets: any, attributeToHide: string) => {
      // extract attribute to hide from object
      const toEncrypt = { [attributeToHide]: deets[attributeToHide] };
      delete deets[attributeToHide];

      // actually create the saved object to know the id
      const savedObject = await savedObjectsClient.create(this.type, deets, {
        id: crypto.randomBytes(32).toString('base64'),
      });

      // now encrypt
      const hidden = crypt.encrypt(toEncrypt, savedObject);

      // lastly put the encrypted details into the saved object
      return await savedObjectsClient.update(
        savedObject.type,
        savedObject.id,
        { secret: hidden },
        { version: savedObject.version } // keep the same version
      );
    };

    this.unhideAttribute = async (id: string) => {
      const encKey = 'secret';

      // retrieve the saved object by id.
      const savedObject: any = await savedObjectsClient.get(this.type, id);

      // extract the hidden secret value
      const toDecrypt = savedObject.attributes[encKey];
      delete savedObject.attributes[encKey];

      // decrypt the details
      try {
        const unhidden = crypt.decrypt(toDecrypt, savedObject);

        // return the details only if the saved object was not modified
        if (unhidden) {
          savedObject.attributes = {
            ...savedObject.attributes,
            ...unhidden,
          };
          return savedObject;
        }
      } catch (e) {
        throw Error(`SecretStore Decrypt Failed: ${e.message}`);
      }

      return undefined;
    };
  }
}
