/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Subscription, Subject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { once } from 'lodash';

import { Capabilities, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';
import { LicensingPluginSetup } from '../../licensing/public';

// @ts-ignore
import { LogstashLicenseService } from './services';

interface SetupDeps {
  licensing: LicensingPluginSetup;
  management: ManagementSetup;

  home?: HomePublicPluginSetup;
}

export class LogstashPlugin implements Plugin<void, void, SetupDeps> {
  private licenseSubscription?: Subscription;
  private capabilities$ = new Subject<Capabilities>();

  public setup(core: CoreSetup, plugins: SetupDeps) {
    const logstashLicense$ = plugins.licensing.license$.pipe(
      map((license) => new LogstashLicenseService(license))
    );

    const managementApp = plugins.management.sections.section.ingest.registerApp({
      id: 'pipelines',
      title: i18n.translate('xpack.logstash.managementSection.pipelinesTitle', {
        defaultMessage: 'Logstash Pipelines',
      }),
      order: 1,
      mount: async (params) => {
        const [coreStart] = await core.getStartServices();
        const { renderApp } = await import('./application');
        const isMonitoringEnabled = 'monitoring' in plugins;

        return renderApp(coreStart, params, isMonitoringEnabled, logstashLicense$);
      },
    });

    this.licenseSubscription = combineLatest([logstashLicense$, this.capabilities$]).subscribe(
      ([license, capabilities]) => {
        const shouldShow = license.enableLinks && capabilities.management.ingest.pipelines === true;
        if (shouldShow) {
          managementApp.enable();
        } else {
          managementApp.disable();
        }

        if (plugins.home && shouldShow) {
          // Ensure that we don't register the feature more than once
          once(() => {
            plugins.home!.featureCatalogue.register({
              id: 'management_logstash',
              title: i18n.translate('xpack.logstash.homeFeature.logstashPipelinesTitle', {
                defaultMessage: 'Logstash Pipelines',
              }),
              description: i18n.translate(
                'xpack.logstash.homeFeature.logstashPipelinesDescription',
                {
                  defaultMessage: 'Create, delete, update, and clone data ingestion pipelines.',
                }
              ),
              icon: 'pipelineApp',
              path: '/app/management/ingest/pipelines',
              showOnHomePage: false,
              category: 'admin',
            });
          });
        }
      }
    );
  }

  public start(core: CoreStart) {
    this.capabilities$.next(core.application.capabilities);
  }

  public stop() {
    if (this.licenseSubscription) {
      this.licenseSubscription.unsubscribe();
    }
  }
}
