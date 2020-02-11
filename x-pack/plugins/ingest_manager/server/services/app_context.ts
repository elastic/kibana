/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BehaviorSubject } from 'rxjs';
import { IClusterClient } from 'kibana/server';
import { IngestManagerAppContext } from '../plugin';
import { EncryptedSavedObjectsPluginStart } from '../../../encrypted_saved_objects/server';
import { ILicense } from '../../../licensing/server';
import { SecurityPluginSetup } from '../../../security/server';

class AppContextService {
  private clusterClient: IClusterClient | undefined;
  private encryptedSavedObjects: EncryptedSavedObjectsPluginStart | undefined;
  private security: SecurityPluginSetup | undefined;
  private license$: IngestManagerAppContext['license$'];
  // private config$: IngestManagerAppContext['config$'];
  private licenseSubject$?: BehaviorSubject<ILicense>;

  public start(appContext: IngestManagerAppContext) {
    this.clusterClient = appContext.clusterClient;
    this.encryptedSavedObjects = appContext.encryptedSavedObjects;
    this.security = appContext.security;

    this.license$ = appContext.license$;
    this.licenseSubject$ = new BehaviorSubject(this.license$);
    // errors with 'Expected an assignment or function call and instead saw an expression.'
    // this.license$?.subscribe(this.licenseSubject$);

    // this.config$ = appContext.config$;
  }

  public stop() {}

  public getClusterClient() {
    return this.clusterClient;
  }

  public getEncryptedSavedObjects() {
    return this.encryptedSavedObjects;
  }

  public getSecurity() {
    return this.security;
  }

  public getLicenseInformation() {
    return this.licenseSubject$?.value;
  }

  public getLicenseInformation$() {
    return this.license$;
  }
}

export const appContextService = new AppContextService();
