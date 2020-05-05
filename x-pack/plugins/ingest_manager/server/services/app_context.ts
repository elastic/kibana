/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BehaviorSubject, Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { SavedObjectsServiceStart, HttpServerInfo } from 'src/core/server';
import { EncryptedSavedObjectsPluginStart } from '../../../encrypted_saved_objects/server';
import { SecurityPluginSetup } from '../../../security/server';
import { IngestManagerConfigType } from '../../common';
import { IngestManagerAppContext } from '../plugin';
import { CloudSetup } from '../../../cloud/server';

class AppContextService {
  private encryptedSavedObjects: EncryptedSavedObjectsPluginStart | undefined;
  private security: SecurityPluginSetup | undefined;
  private config$?: Observable<IngestManagerConfigType>;
  private configSubject$?: BehaviorSubject<IngestManagerConfigType>;
  private savedObjects: SavedObjectsServiceStart | undefined;
  private serverInfo: HttpServerInfo | undefined;
  private isProductionMode: boolean = false;
  private cloud?: CloudSetup;

  public async start(appContext: IngestManagerAppContext) {
    this.encryptedSavedObjects = appContext.encryptedSavedObjects;
    this.security = appContext.security;
    this.savedObjects = appContext.savedObjects;
    this.serverInfo = appContext.serverInfo;
    this.isProductionMode = appContext.isProductionMode;
    this.cloud = appContext.cloud;

    if (appContext.config$) {
      this.config$ = appContext.config$;
      const initialValue = await this.config$.pipe(first()).toPromise();
      this.configSubject$ = new BehaviorSubject(initialValue);
      this.config$.subscribe(this.configSubject$);
    }
  }

  public stop() {}

  public getEncryptedSavedObjects() {
    if (!this.encryptedSavedObjects) {
      throw new Error('Encrypted saved object start service not set.');
    }
    return this.encryptedSavedObjects;
  }

  public getSecurity() {
    if (!this.security) {
      throw new Error('Secury service not set.');
    }
    return this.security;
  }

  public getCloud() {
    return this.cloud;
  }

  public getConfig() {
    return this.configSubject$?.value;
  }

  public getConfig$() {
    return this.config$;
  }

  public getSavedObjects() {
    if (!this.savedObjects) {
      throw new Error('Saved objects start service not set.');
    }
    return this.savedObjects;
  }

  public getIsProductionMode() {
    return this.isProductionMode;
  }

  public getServerInfo() {
    if (!this.serverInfo) {
      throw new Error('Server info not set.');
    }
    return this.serverInfo;
  }
}

export const appContextService = new AppContextService();
