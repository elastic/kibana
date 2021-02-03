/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BehaviorSubject, Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import {
  ElasticsearchClient,
  SavedObjectsServiceStart,
  HttpServiceSetup,
  Logger,
  KibanaRequest,
} from 'src/core/server';
import {
  EncryptedSavedObjectsClient,
  EncryptedSavedObjectsPluginSetup,
} from '../../../encrypted_saved_objects/server';
import packageJSON from '../../../../../package.json';
import { SecurityPluginStart } from '../../../security/server';
import { FleetConfigType } from '../../common';
import { ExternalCallback, ExternalCallbacksStorage, FleetAppContext } from '../plugin';
import { CloudSetup } from '../../../cloud/server';

class AppContextService {
  private encryptedSavedObjects: EncryptedSavedObjectsClient | undefined;
  private encryptedSavedObjectsSetup: EncryptedSavedObjectsPluginSetup | undefined;
  private esClient: ElasticsearchClient | undefined;
  private security: SecurityPluginStart | undefined;
  private config$?: Observable<FleetConfigType>;
  private configSubject$?: BehaviorSubject<FleetConfigType>;
  private savedObjects: SavedObjectsServiceStart | undefined;
  private isProductionMode: FleetAppContext['isProductionMode'] = false;
  private kibanaVersion: FleetAppContext['kibanaVersion'] = packageJSON.version;
  private kibanaBranch: FleetAppContext['kibanaBranch'] = packageJSON.branch;
  private cloud?: CloudSetup;
  private logger: Logger | undefined;
  private httpSetup?: HttpServiceSetup;
  private externalCallbacks: ExternalCallbacksStorage = new Map();

  public async start(appContext: FleetAppContext) {
    this.esClient = appContext.elasticsearch.client.asInternalUser;
    this.encryptedSavedObjects = appContext.encryptedSavedObjectsStart?.getClient();
    this.encryptedSavedObjectsSetup = appContext.encryptedSavedObjectsSetup;
    this.security = appContext.security;
    this.savedObjects = appContext.savedObjects;
    this.isProductionMode = appContext.isProductionMode;
    this.cloud = appContext.cloud;
    this.logger = appContext.logger;
    this.kibanaVersion = appContext.kibanaVersion;
    this.kibanaBranch = appContext.kibanaBranch;
    this.httpSetup = appContext.httpSetup;

    if (appContext.config$) {
      this.config$ = appContext.config$;
      const initialValue = await this.config$.pipe(first()).toPromise();
      this.configSubject$ = new BehaviorSubject(initialValue);
      this.config$.subscribe(this.configSubject$);
    }
  }

  public stop() {
    this.externalCallbacks.clear();
  }

  public getEncryptedSavedObjects() {
    if (!this.encryptedSavedObjects) {
      throw new Error('Encrypted saved object start service not set.');
    }
    return this.encryptedSavedObjects;
  }

  public getSecurity() {
    if (!this.security) {
      throw new Error('Security service not set.');
    }
    return this.security;
  }

  public getCloud() {
    return this.cloud;
  }

  public getLogger() {
    if (!this.logger) {
      throw new Error('Logger not set.');
    }
    return this.logger;
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

  public getInternalUserSOClient(request: KibanaRequest) {
    // soClient as kibana internal users, be careful on how you use it, security is not enabled
    return appContextService.getSavedObjects().getScopedClient(request, {
      excludedWrappers: ['security'],
    });
  }

  public getInternalUserESClient() {
    if (!this.esClient) {
      throw new Error('Elasticsearch start service not set.');
    }
    // soClient as kibana internal users, be careful on how you use it, security is not enabled
    return this.esClient;
  }

  public getIsProductionMode() {
    return this.isProductionMode;
  }

  public getHttpSetup() {
    if (!this.httpSetup) {
      throw new Error('HttpServiceSetup not set.');
    }
    return this.httpSetup;
  }

  public getEncryptedSavedObjectsSetup() {
    return this.encryptedSavedObjectsSetup;
  }

  public getKibanaVersion() {
    return this.kibanaVersion;
  }

  public getKibanaBranch() {
    return this.kibanaBranch;
  }

  public addExternalCallback(type: ExternalCallback[0], callback: ExternalCallback[1]) {
    if (!this.externalCallbacks.has(type)) {
      this.externalCallbacks.set(type, new Set());
    }
    this.externalCallbacks.get(type)!.add(callback);
  }

  public getExternalCallbacks(type: ExternalCallback[0]) {
    if (this.externalCallbacks) {
      return this.externalCallbacks.get(type);
    }
  }
}

export const appContextService = new AppContextService();
