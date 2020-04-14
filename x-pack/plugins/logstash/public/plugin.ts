/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { first, map } from 'rxjs/operators';
import { once } from 'lodash';

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import {
  HomePublicPluginSetup,
  FeatureCatalogueCategory,
} from '../../../../src/plugins/home/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';

// @ts-ignore
import { PLUGIN } from '../common/constants';
import {
  LogstashLicenseService,
  // @ts-ignore
} from './services';
// @ts-ignore
import { registerEditSection } from './sections/pipeline_edit';
// @ts-ignore
import { registerListSection } from './sections/pipeline_list';
import { SecurityPluginSetup } from '../../security/public';

interface SetupDeps {
  licensing: LicensingPluginSetup;
  management: ManagementSetup;

  home?: HomePublicPluginSetup;
  security?: SecurityPluginSetup;
}

export class LogstashPlugin implements Plugin<void, void, SetupDeps> {
  public setup(core: CoreSetup, plugins: SetupDeps) {
    const logstashLicense$ = plugins.licensing.license$.pipe(
      map(license => new LogstashLicenseService(license))
    );
    const section = plugins.management.sections.getSection('logstash')!;
    const managementApp = section.registerApp({
      id: 'pipelines',
      title: i18n.translate('xpack.logstash.managementSection.pipelinesTitle', {
        defaultMessage: 'Pipelines',
      }),
      order: 10,
      mount: async params => {
        const [coreStart] = await core.getStartServices();
        const { renderApp } = await import('./sections');

        return renderApp(coreStart, params, logstashLicense$, plugins.security);
      },
    });

    logstashLicense$
      .pipe(first())
      .toPromise()
      .then((license: any) => {
        if (license.enableLinks) {
          managementApp.enable();
        } else {
          managementApp.disable();
        }

        if (plugins.home && license.enableLinks) {
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
              path: '/app/kibana#/management/logstash/pipelines',
              showOnHomePage: true,
              category: FeatureCatalogueCategory.ADMIN,
            });
          });
        }
      });
  }

  public start(core: CoreStart) {}

  public stop() {}
}
