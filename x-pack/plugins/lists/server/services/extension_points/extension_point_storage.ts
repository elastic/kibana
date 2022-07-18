/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import {
  ExtensionPoint,
  ExtensionPointStorageClientInterface,
  ExtensionPointStorageInterface,
  NarrowExtensionPointToType,
} from './types';
import { ExtensionPointStorageClient } from './extension_point_storage_client';

export class ExtensionPointStorage implements ExtensionPointStorageInterface {
  private readonly store = new Map<ExtensionPoint['type'], Set<ExtensionPoint>>();
  private readonly registeredFrom = new Map<ExtensionPoint, string>();

  constructor(private readonly logger: Logger) {}

  add(extension: ExtensionPoint): void {
    if (!this.store.has(extension.type)) {
      this.store.set(extension.type, new Set());
    }

    const extensionPointsForType = this.store.get(extension.type);

    if (extensionPointsForType) {
      extensionPointsForType.add(extension);

      // Capture stack trace from where this extension point was registered, so that it can be used when
      // errors occur or callbacks don't return the expected result
      const from = new Error('REGISTERED FROM:').stack ?? 'REGISTERED FROM: unknown';
      this.registeredFrom.set(
        extension,
        from.substring(from.indexOf('REGISTERED FROM:')).concat('\n    ----------------------')
      );
    }
  }

  clear(): void {
    this.store.clear();
    this.registeredFrom.clear();
  }

  getExtensionRegistrationSource(extensionPoint: ExtensionPoint): string | undefined {
    return this.registeredFrom.get(extensionPoint);
  }

  get<T extends ExtensionPoint['type']>(
    extensionType: T
  ): Set<NarrowExtensionPointToType<T>> | undefined {
    const extensionDefinitions = this.store.get(extensionType);

    if (extensionDefinitions) {
      return extensionDefinitions as Set<NarrowExtensionPointToType<T>>;
    }

    return undefined;
  }

  /**
   * returns a client interface that does not expose the full set of methods available in the storage
   */
  getClient(): ExtensionPointStorageClientInterface {
    return new ExtensionPointStorageClient(this, this.logger);
  }
}
