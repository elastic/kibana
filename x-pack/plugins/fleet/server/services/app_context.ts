/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/logging';
import { kibanaPackageJson } from '@kbn/utils';
import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';

import type { ElasticsearchClient } from '../../../../../src/core/server/elasticsearch/client/types';
import type { KibanaRequest } from '../../../../../src/core/server/http/router/request';
import type { HttpServiceSetup } from '../../../../../src/core/server/http/types';
import type { SavedObjectsServiceStart } from '../../../../../src/core/server/saved_objects/saved_objects_service';
import type { DataPluginStart } from '../../../../../src/plugins/data/server/plugin';
import type { CloudSetup } from '../../../cloud/server/plugin';
import type { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server/plugin';
import type { EncryptedSavedObjectsClient } from '../../../encrypted_saved_objects/server/saved_objects';
import type { SecurityPluginStart } from '../../../security/server/plugin';
import type { FleetConfigType } from '../../common/types';
import type { FleetAppContext } from '../plugin';
import type {
  ExternalCallback,
  ExternalCallbacksStorage,
  PostPackagePolicyCreateCallback,
  PostPackagePolicyDeleteCallback,
  PutPackagePolicyUpdateCallback,
} from '../types/extensions';

class AppContextService {
  private encryptedSavedObjects: EncryptedSavedObjectsClient | undefined;
  private encryptedSavedObjectsSetup: EncryptedSavedObjectsPluginSetup | undefined;
  private data: DataPluginStart | undefined;
  private esClient: ElasticsearchClient | undefined;
  private security: SecurityPluginStart | undefined;
  private config$?: Observable<FleetConfigType>;
  private configSubject$?: BehaviorSubject<FleetConfigType>;
  private savedObjects: SavedObjectsServiceStart | undefined;
  private isProductionMode: FleetAppContext['isProductionMode'] = false;
  private kibanaVersion: FleetAppContext['kibanaVersion'] = kibanaPackageJson.version;
  private kibanaBranch: FleetAppContext['kibanaBranch'] = kibanaPackageJson.branch;
  private cloud?: CloudSetup;
  private logger: Logger | undefined;
  private httpSetup?: HttpServiceSetup;
  private externalCallbacks: ExternalCallbacksStorage = new Map();

  public start(appContext: FleetAppContext) {
    this.data = appContext.data;
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
      const initialValue = appContext.configInitialValue;
      this.configSubject$ = new BehaviorSubject(initialValue);
      this.config$.subscribe(this.configSubject$);
    }
  }

  public stop() {
    this.externalCallbacks.clear();
  }

  public getData() {
    if (!this.data) {
      throw new Error('Data start service not set.');
    }
    return this.data;
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

  public hasSecurity() {
    return !!this.security;
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

  public getExternalCallbacks<T extends ExternalCallback[0]>(
    type: T
  ):
    | Set<
        T extends 'packagePolicyCreate'
          ? PostPackagePolicyCreateCallback
          : T extends 'postPackagePolicyDelete'
          ? PostPackagePolicyDeleteCallback
          : PutPackagePolicyUpdateCallback
      >
    | undefined {
    if (this.externalCallbacks) {
      return this.externalCallbacks.get(type) as Set<
        T extends 'packagePolicyCreate'
          ? PostPackagePolicyCreateCallback
          : T extends 'postPackagePolicyDelete'
          ? PostPackagePolicyDeleteCallback
          : PutPackagePolicyUpdateCallback
      >;
    }
  }
}

export const appContextService = new AppContextService();
