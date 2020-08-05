/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable max-classes-per-file */
import { IScope } from 'angular';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isLeft } from 'fp-ts/lib/Either';
import { first } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { SecurityPluginSetup } from '../../../../../security/public';
import { BufferedKibanaServiceCall, KibanaAdapterServiceRefs, KibanaUIConfig } from '../../types';
import {
  FrameworkAdapter,
  FrameworkInfo,
  FrameworkUser,
  RuntimeFrameworkInfo,
  RuntimeFrameworkUser,
} from './adapter_types';
import {
  ManagementSetup,
  RegisterManagementAppArgs,
} from '../../../../../../../src/plugins/management/public';
import { LicensingPluginSetup } from '../../../../../licensing/public';
import { BeatsManagementConfigType } from '../../../../common';

export class KibanaFrameworkAdapter implements FrameworkAdapter {
  public get info() {
    if (this.xpackInfo) {
      return this.xpackInfo;
    } else {
      throw new Error('framework adapter must have init called before anything else');
    }
  }

  public get currentUser() {
    return this.shieldUser!;
  }
  private xpackInfo: FrameworkInfo | null = null;
  private adapterService: KibanaAdapterServiceProvider;
  private shieldUser: FrameworkUser | null = null;
  constructor(
    private readonly PLUGIN_ID: string,
    private readonly management: ManagementSetup,
    private readonly getBasePath: () => string,
    private readonly licensing: LicensingPluginSetup,
    private readonly securitySetup: SecurityPluginSetup | undefined,
    private readonly config: BeatsManagementConfigType,
    public readonly version: string
  ) {
    this.adapterService = new KibanaAdapterServiceProvider();
  }

  public setUISettings = (key: string, value: any) => {
    this.adapterService.callOrBuffer(({ config }) => {
      config.set(key, value);
    });
  };

  public async waitUntilFrameworkReady(): Promise<void> {
    const license = await this.licensing.license$.pipe(first()).toPromise();
    let xpackInfoUnpacked: FrameworkInfo;

    try {
      xpackInfoUnpacked = {
        basePath: this.getBasePath(),
        license: {
          type: license.type ?? 'oss',
          expired: !license.isActive,
          expiry_date_in_millis: license.expiryDateInMillis ?? -1,
        },
        security: {
          enabled: license.getFeature('security').isEnabled,
          available: license.getFeature('security').isAvailable,
        },
        settings: this.config,
      };
    } catch (e) {
      throw new Error(`Unexpected data structure from xpackInfoService, ${JSON.stringify(e)}`);
    }

    const assertData = RuntimeFrameworkInfo.decode(xpackInfoUnpacked);
    if (isLeft(assertData)) {
      throw new Error(
        `Error parsing xpack info in ${this.PLUGIN_ID},   ${PathReporter.report(assertData)[0]}`
      );
    }
    this.xpackInfo = xpackInfoUnpacked;

    try {
      this.shieldUser = (await this.securitySetup?.authc.getCurrentUser()) || null;
      const assertUser = RuntimeFrameworkUser.decode(this.shieldUser);

      if (isLeft(assertUser)) {
        throw new Error(
          `Error parsing user info in ${this.PLUGIN_ID},   ${PathReporter.report(assertUser)[0]}`
        );
      }
    } catch (e) {
      this.shieldUser = null;
    }
  }

  public registerManagementUI(mount: RegisterManagementAppArgs['mount']) {
    const section = this.management.sections.section.ingest;
    section.registerApp({
      id: 'beats_management',
      title: i18n.translate('xpack.beatsManagement.centralManagementLinkLabel', {
        defaultMessage: 'Beats Central Management',
      }),
      order: 2,
      mount,
    });
  }
}

class KibanaAdapterServiceProvider {
  public serviceRefs: KibanaAdapterServiceRefs | null = null;
  public bufferedCalls: Array<BufferedKibanaServiceCall<KibanaAdapterServiceRefs>> = [];

  public $get($rootScope: IScope, config: KibanaUIConfig) {
    this.serviceRefs = {
      config,
      rootScope: $rootScope,
    };

    this.applyBufferedCalls(this.bufferedCalls);

    return this;
  }

  public callOrBuffer(serviceCall: (serviceRefs: KibanaAdapterServiceRefs) => void) {
    if (this.serviceRefs !== null) {
      this.applyBufferedCalls([serviceCall]);
    } else {
      this.bufferedCalls.push(serviceCall);
    }
  }

  public applyBufferedCalls(
    bufferedCalls: Array<BufferedKibanaServiceCall<KibanaAdapterServiceRefs>>
  ) {
    if (!this.serviceRefs) {
      return;
    }

    this.serviceRefs.rootScope.$apply(() => {
      bufferedCalls.forEach((serviceCall) => {
        if (!this.serviceRefs) {
          return;
        }
        return serviceCall(this.serviceRefs);
      });
    });
  }
}
