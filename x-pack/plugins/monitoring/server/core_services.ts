/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, CoreSetup } from 'kibana/server';

import { SavedObjectsClient } from '../../../../src/core/server';

export class CoreServices {
  private static _coreSetup: CoreSetup;
  private static _coreStart: CoreStart;

  public static init(core: CoreSetup) {
    this._coreSetup = core;
  }

  public static get coreSetup(): CoreSetup {
    this.checkError();
    return this._coreSetup;
  }

  public static async getCoreStart(): Promise<CoreStart> {
    if (this._coreStart) {
      return this._coreStart;
    }
    const [coreStart] = await this.coreSetup.getStartServices();
    this._coreStart = coreStart;
    return coreStart;
  }

  public static async getUISetting(key: string) {
    const coreStart = await this.getCoreStart();
    const { savedObjects, uiSettings } = coreStart;
    const savedObjectsClient = new SavedObjectsClient(savedObjects.createInternalRepository());
    const theSettings = uiSettings.asScopedToClient(savedObjectsClient);
    return await theSettings.get(key);
  }

  private static checkError() {
    if (!this._coreSetup) {
      throw new Error(
        'CoreServices has not been initialized. Please run CoreServices.init(...) before use'
      );
    }
  }
}
