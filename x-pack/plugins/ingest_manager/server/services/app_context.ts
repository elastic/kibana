/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BehaviorSubject, Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { EncryptedSavedObjectsPluginStart } from '../../../encrypted_saved_objects/server';
import { SecurityPluginSetup } from '../../../security/server';
import { IngestManagerConfigType } from '../../common';
import { IngestManagerAppContext } from '../plugin';

class AppContextService {
  private encryptedSavedObjects: EncryptedSavedObjectsPluginStart | undefined;
  private security: SecurityPluginSetup | undefined;
  private config$?: Observable<IngestManagerConfigType>;
  private configSubject$?: BehaviorSubject<IngestManagerConfigType>;

  public async start(appContext: IngestManagerAppContext) {
    this.encryptedSavedObjects = appContext.encryptedSavedObjects;
    this.security = appContext.security;

    if (appContext.config$) {
      this.config$ = appContext.config$;
      const initialValue = await this.config$.pipe(first()).toPromise();
      this.configSubject$ = new BehaviorSubject(initialValue);
      this.config$.subscribe(this.configSubject$);
    }
  }

  public stop() {}

  public getEncryptedSavedObjects() {
    return this.encryptedSavedObjects;
  }

  public getSecurity() {
    return this.security;
  }

  public getConfig() {
    return this.configSubject$?.value;
  }

  public getConfig$() {
    return this.config$;
  }
}

export const appContextService = new AppContextService();
