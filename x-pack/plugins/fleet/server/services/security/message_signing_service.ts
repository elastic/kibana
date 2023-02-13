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
}

export interface MessageSigningServiceInterface {
  generateKeyPair(providedPassphrase?: string): Promise<void>;
  sign(serializedMessage: Buffer | object): Promise<{ data: Buffer; signature: string }>;
  getPublicKey(): Promise<string>;
}

export class MessageSigningService implements MessageSigningServiceInterface {
  private _soClient: SavedObjectsClientContract | undefined;

  constructor(private esoClient: EncryptedSavedObjectsClient) {}

  public async generateKeyPair(providedPassphrase?: string) {
    this.checkForEncryptionKey();

    const currentKeyPair = await this.getCurrentKeyPair();
    if (currentKeyPair.privateKey && currentKeyPair.publicKey && currentKeyPair.passphrase) {
      return;
    }

    const passphrase = providedPassphrase || this.generatePassphrase();

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

    await this.soClient.create<MessageSigningKeys>(MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE, {
      private_key: keyPair.privateKey.toString('base64'),
      public_key: keyPair.publicKey.toString('base64'),
      passphrase,
    });

    return;
  }

  public async sign(
    message: Buffer | Record<string, unknown>
  ): Promise<{ data: Buffer; signature: string }> {
    this.checkForEncryptionKey();

    const msgBuffer = Buffer.isBuffer(message)
      ? message
      : Buffer.from(JSON.stringify(message), 'utf8');

    const signer = createSign('SHA256');
    signer.update(msgBuffer);
    signer.end();

    const { privateKey: serializedPrivateKey, passphrase } = await this.getCurrentKeyPair();

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
    this.checkForEncryptionKey();

    const { publicKey } = await this.getCurrentKeyPair();

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
    privateKey: string;
    publicKey: string;
    passphrase: string;
  }> {
    const finder =
      await this.esoClient.createPointInTimeFinderDecryptedAsInternalUser<MessageSigningKeys>({
        type: MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE,
        perPage: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    let keyPair = {
      privateKey: '',
      publicKey: '',
      passphrase: '',
    };
    for await (const result of finder.find()) {
      const attributes = result.saved_objects[0]?.attributes;
      if (!attributes?.private_key) {
        break;
      }
      keyPair = {
        privateKey: attributes.private_key,
        publicKey: attributes.public_key,
        passphrase: attributes.passphrase,
      };
      break;
    }

    return keyPair;
  }

  private generatePassphrase(): string {
    return randomBytes(32).toString('hex');
  }

  private checkForEncryptionKey(): void {
    if (!appContextService.getEncryptedSavedObjectsSetup()?.canEncrypt) {
      throw new Error('encryption key not set, message signing service is disabled');
    }
  }
}
