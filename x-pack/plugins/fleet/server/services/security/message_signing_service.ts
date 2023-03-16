/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateKeyPairSync, createSign, randomBytes } from 'crypto';

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';

import { MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE } from '../../constants';
import { appContextService } from '../app_context';

interface MessageSigningKeys {
  private_key: string;
  public_key: string;
  passphrase: string;
  passphrase_plain: string;
}

export interface MessageSigningServiceInterface {
  get isEncryptionAvailable(): boolean;
  generateKeyPair(
    providedPassphrase?: string
  ): Promise<{ privateKey: string; publicKey: string; passphrase: string }>;
  sign(message: Buffer | Record<string, unknown>): Promise<{ data: Buffer; signature: string }>;
  getPublicKey(): Promise<string>;
}

export class MessageSigningService implements MessageSigningServiceInterface {
  private _soClient: SavedObjectsClientContract | undefined;

  constructor(private esoClient: EncryptedSavedObjectsClient) {}

  public get isEncryptionAvailable(): boolean {
    return appContextService.getEncryptedSavedObjectsSetup()?.canEncrypt ?? false;
  }

  public async generateKeyPair(providedPassphrase?: string): Promise<{
    privateKey: string;
    publicKey: string;
    passphrase: string;
  }> {
    let passphrase = providedPassphrase || this.generatePassphrase();

    const currentKeyPair = await this.getCurrentKeyPair();
    if (
      currentKeyPair.privateKey &&
      currentKeyPair.publicKey &&
      (currentKeyPair.passphrase || currentKeyPair.passphrasePlain)
    ) {
      passphrase = currentKeyPair.passphrase || currentKeyPair.passphrasePlain;

      // newly configured encryption key, encrypt the passphrase
      if (currentKeyPair.passphrasePlain && this.isEncryptionAvailable) {
        await this.soClient.update<MessageSigningKeys>(
          MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE,
          currentKeyPair.id,
          {
            passphrase,
            passphrase_plain: '',
          }
        );
      }

      return {
        privateKey: currentKeyPair.privateKey,
        publicKey: currentKeyPair.publicKey,
        passphrase,
      };
    }

    const keyPair = generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'der',
        cipher: 'aes-256-cbc',
        passphrase,
      },
      publicKeyEncoding: {
        type: 'spki',
        format: 'der',
      },
    });

    const privateKey = keyPair.privateKey.toString('base64');
    const publicKey = keyPair.publicKey.toString('base64');
    let keypairSoObject: Partial<MessageSigningKeys> = {
      private_key: privateKey,
      public_key: publicKey,
    };
    keypairSoObject = this.isEncryptionAvailable
      ? {
          ...keypairSoObject,
          passphrase,
        }
      : { ...keypairSoObject, passphrase_plain: passphrase };

    await this.soClient.create<Partial<MessageSigningKeys>>(
      MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE,
      keypairSoObject
    );

    return {
      privateKey,
      publicKey,
      passphrase,
    };
  }

  public async sign(
    message: Buffer | Record<string, unknown>
  ): Promise<{ data: Buffer; signature: string }> {
    const { privateKey: serializedPrivateKey, passphrase } = await this.generateKeyPair();

    const msgBuffer = Buffer.isBuffer(message)
      ? message
      : Buffer.from(JSON.stringify(message), 'utf8');

    const signer = createSign('SHA256');
    signer.update(msgBuffer);
    signer.end();

    if (!serializedPrivateKey) {
      throw new Error('unable to find private key');
    }
    if (!passphrase) {
      throw new Error('unable to find passphrase');
    }

    const privateKey = Buffer.from(serializedPrivateKey, 'base64');
    const signature = signer.sign(
      { key: privateKey, passphrase, format: 'der', type: 'pkcs8' },
      'base64'
    );
    return {
      data: msgBuffer,
      signature,
    };
  }

  public async getPublicKey(): Promise<string> {
    const { publicKey } = await this.generateKeyPair();

    if (!publicKey) {
      throw new Error('unable to find public key');
    }

    return publicKey;
  }

  private get soClient() {
    if (this._soClient) {
      return this._soClient;
    }

    const fakeRequest = {
      headers: {},
      getBasePath: () => '',
      path: '/',
      route: { settings: {} },
      url: { href: {} },
      raw: { req: { url: '/' } },
    } as unknown as KibanaRequest;

    this._soClient = appContextService.getSavedObjects().getScopedClient(fakeRequest, {
      excludedExtensions: [SECURITY_EXTENSION_ID],
      includedHiddenTypes: [MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE],
    });

    return this._soClient;
  }

  private async getCurrentKeyPair(): Promise<{
    id: string;
    privateKey: string;
    publicKey: string;
    passphrase: string;
    passphrasePlain: string;
  }> {
    const finder =
      await this.esoClient.createPointInTimeFinderDecryptedAsInternalUser<MessageSigningKeys>({
        type: MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE,
        perPage: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    let keyPair = {
      id: '',
      privateKey: '',
      publicKey: '',
      passphrase: '',
      passphrasePlain: '',
    };
    for await (const result of finder.find()) {
      const savedObject = result.saved_objects[0];
      const attributes = savedObject?.attributes;
      if (!attributes?.private_key) {
        break;
      }
      keyPair = {
        id: savedObject.id,
        privateKey: attributes.private_key,
        publicKey: attributes.public_key,
        passphrase: attributes.passphrase,
        passphrasePlain: attributes.passphrase_plain,
      };
      break;
    }

    return keyPair;
  }

  private generatePassphrase(): string {
    return randomBytes(32).toString('hex');
  }
}
