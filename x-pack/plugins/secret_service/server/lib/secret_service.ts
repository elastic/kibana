/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import { SavedObjectsClient } from 'src/server/saved_objects';
// @ts-ignore
import { AuditLogger } from '../../../server/lib/audit_logger';
import { buildCrypt } from './crypt_keeper';

type SSEvents = 'secret_object_created' | 'secret_object_accessed';

export class SecretService {
  public readonly hideAttribute: (deets: any, secretKey: string) => any;
  public readonly unhideAttribute: (deets: any) => any;
  private readonly type: string;
  private readonly auditor?: AuditLogger;

  constructor(
    savedObjectsClient: SavedObjectsClient,
    type: string,
    key?: Buffer,
    auditor?: AuditLogger
  ) {
    this.type = type;
    this.auditor = auditor;
    key = key || crypto.randomBytes(128);
    const crypt = buildCrypt({ key: key.toString('hex') });

    const logEvent = (event: SSEvents, message?: string) => {
      if (this.auditor) {
        this.auditor.log(event, message);
      }
    };
    this.hideAttribute = async (toEncrypt: any) => {
      const id = crypto.randomBytes(32).toString('base64');

      // now encrypt
      const secret = crypt.encrypt(JSON.stringify(toEncrypt), id);

      // lastly put the encrypted details into the saved object
      const so = await savedObjectsClient.create(this.type, { secret }, { id });

      logEvent('secret_object_created', `Secret object id:${so.id} was created at ${new Date()}`);

      return so;
    };

    this.unhideAttribute = async (id: string) => {
      const encKey = 'secret';

      // retrieve the saved object by id.
      const savedObject: any = await savedObjectsClient.get(this.type, id);

      // extract the hidden secret value
      const toDecrypt = savedObject.attributes[encKey];

      // decrypt the details
      try {
        const unhidden = crypt.decrypt(toDecrypt, id);

        // return the details only if the saved object was not modified
        if (unhidden) {
          logEvent(
            'secret_object_accessed',
            `Saved object id:${savedObject.id} accessed at ${new Date()}`
          );
          return {
            ...savedObject,
            attributes: {
              ...JSON.parse(unhidden),
            },
          };
        }
      } catch (e) {
        throw Error(`SecretService Decrypt Failed: ${e.message}`);
      }

      return undefined;
    };
  }
}
