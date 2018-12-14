/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import Iron from 'iron';
import hash from 'object-hash';
import { SavedObjectsClient } from 'src/server/saved_objects';

export class SecretStore {
  public readonly hide: (deets: any) => any;
  public readonly unhide: (deets: any) => any;
  public readonly hideAttribute: (deets: any, secretKey: string) => any;
  public readonly unhideAttribute: (deets: any) => any;
  private readonly type: string;
  private readonly hashCheck: boolean;

  constructor(savedObjectsClient: SavedObjectsClient, type: string, hashCheck?: boolean) {
    this.hashCheck = hashCheck || true;
    this.type = type;
    const secretKey = crypto.randomBytes(32).toString('hex');
    const weakMap = new WeakMap();
    weakMap.set(this, {
      [secretKey]: crypto.randomBytes(256).toString('hex'),
    });

    this.hide = async (deets: any) => {
      return await Iron.seal(deets, weakMap.get(this)[secretKey], Iron.defaults);
    };

    this.unhide = async (deets: any) => {
      return await Iron.unseal(deets, weakMap.get(this)[secretKey], Iron.defaults);
    };

    this.hideAttribute = async (deets: any, attributeToHide: string) => {
      // extract attribute to hide from object
      const toEncrypt = { [attributeToHide]: deets[attributeToHide] };
      delete deets[attributeToHide];

      // actually create the saved object to know the id
      const savedObject = await savedObjectsClient.create(this.type, deets);

      // generate an object hash of the saved object without the secret details
      toEncrypt.original_hash = hash(savedObject);

      // now encrypt
      const hidden = await this.hide(toEncrypt);

      // lastly put the encrypted details into the saved object
      return await savedObjectsClient.update(
        savedObject.type,
        savedObject.id,
        { secret: hidden },
        { version: savedObject.version } // keep the same version
      );
    };

    this.unhideAttribute = async (id: string) => {
      // retrieve the saved object by id.
      const savedObject: any = await savedObjectsClient.get(this.type, id);

      const encKey = 'secret';

      // extract the hidden secret value
      const toDecrypt = savedObject.attributes[encKey];
      delete savedObject.attributes[encKey];

      // this is to be used as a tamper-proof checksum if enabled
      const objectHash = hash(savedObject);

      // decrypt the details
      const unhidden = await this.unhide(toDecrypt);

      // return the details only if the saved object was not modified
      if (objectHash === unhidden.original_hash || !this.hashCheck) {
        delete unhidden.original_hash;
        savedObject.attributes = {
          ...savedObject.attributes,
          ...unhidden,
        };
        return savedObject;
      }

      return undefined;
    };
  }
}
