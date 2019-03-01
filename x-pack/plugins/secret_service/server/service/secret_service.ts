/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignores
import nodeCrypto from '@elastic/node-crypto';
import crypto from 'crypto';
// @ts-ignore
import { AuditLogger } from '../../../../../src/legacy/server/lib/audit_logger';
import { SavedObjectsClient } from '../../../../../src/legacy/server/saved_objects';
import { isConflictError } from '../../../../../src/legacy/server/saved_objects/service/lib/errors';

type SSEvents = 'secret_object_created' | 'secret_object_accessed' | 'secret_object_decrypt_failed';
type SecretId = Promise<string>;

export class SecretService {
  public readonly hideAttribute: (deets: any) => SecretId;
  public readonly unhideAttribute: (deets: any) => any;
  public readonly validateKey: () => Promise<boolean>;
  private readonly type: string;
  private readonly auditor?: AuditLogger;
  private readonly hideAttributeWithId: (id: string, toEncrypt: any) => SecretId;

  constructor(
    savedObjectsClient: SavedObjectsClient,
    type: string,
    key?: Buffer,
    auditor?: AuditLogger
  ) {
    this.type = type;
    this.auditor = auditor;
    key = key || crypto.randomBytes(128);
    const crypt = nodeCrypto({ encryptionKey: key.toString('hex') });

    const logEvent = (event: SSEvents, message?: string) => {
      if (this.auditor) {
        this.auditor.log(event, message);
      }
    };

    this.hideAttribute = async (toEncrypt: any) => {
      return this.hideAttributeWithId(crypto.randomBytes(32).toString('base64'), toEncrypt);
    };

    this.hideAttributeWithId = async (id: string, toEncrypt: any) => {
      // now encrypt
      const secret = await crypt.encrypt(toEncrypt);

      // lastly put the encrypted details into the saved object
      const saved = await savedObjectsClient.create(this.type, { secret }, { id });

      logEvent(
        'secret_object_created',
        `Secret object id:${saved.id} was created at ${new Date()}`
      );

      return saved.id;
    };

    this.unhideAttribute = async (id: string) => {
      const encKey = 'secret';

      // retrieve the saved object by id.
      const savedObject: any = await savedObjectsClient.get(this.type, id);

      // extract the hidden secret value
      const toDecrypt = savedObject.attributes[encKey];

      // decrypt the details
      try {
        const unhidden = await crypt.decrypt(toDecrypt);

        // return the details only if the saved object was not modified
        if (unhidden) {
          logEvent(
            'secret_object_accessed',
            `Saved object id:${savedObject.id} accessed at ${new Date()}`
          );
          return {
            ...savedObject,
            attributes: {
              ...unhidden,
            },
          };
        }
      } catch (e) {
        throw Error(`SecretService Decrypt Failed: ${e.message}`);
      }

      return undefined;
    };

    this.validateKey = async () => {
      const id = '1.0.0:dummy';
      const secret = 'Secret Service v1.0.0';
      let objToValidate;
      try {
        objToValidate = await this.hideAttributeWithId(id, secret);
      } catch (e) {
        if (!isConflictError(e)) {
          throw e;
        }
      }

      try {
        objToValidate = await this.unhideAttribute(id);
      } catch (e) {
        logEvent(
          'secret_object_decrypt_failed',
          "Kibana's encryption key is invalid, please ensure that this instance has the right keystore!"
        );
        throw e;
      }

      return objToValidate.attributes
        ? objToValidate.attributes.secret === 'Secret Service v1.0.0'
        : false;
    };
  }
}
