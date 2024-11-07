/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n as kbnI18n } from '@kbn/i18n';

import type { CoreSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public/plugin';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { PluginInitializerContext } from '@kbn/core/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { ConfigSchema } from '../server/config';
import { registerFeature } from './register_feature';
import { getTransformHealthRuleType } from './alerting';

export interface PluginsDependencies {
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  dataViewEditor?: DataViewEditorStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  management: ManagementSetup;
  home: HomePublicPluginSetup;
  savedSearch: SavedSearchPublicPluginStart;
  share: SharePluginStart;
  spaces?: SpacesApi;
  alerting?: AlertingSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  contentManagement: ContentManagementPublicStart;
}

export class TransformUiPlugin {
  private isServerless: boolean = false;
  private experimentalFeatures: ConfigSchema['experimental'] = {
    ruleFormV2Enabled: false,
  };
  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';
    this.experimentalFeatures =
      initializerContext.config.get().experimental ?? this.experimentalFeatures;
  }

  public setup(coreSetup: CoreSetup<PluginsDependencies>, pluginsSetup: PluginsDependencies): void {
    const { management, home, triggersActionsUi } = pluginsSetup;

    // Register management section
    const esSection = management.sections.section.data;
    esSection.registerApp({
      id: 'transform',
      title: kbnI18n.translate('xpack.transform.appTitle', {
        defaultMessage: 'Transforms',
      }),
      order: 5,
      mount: async (params) => {
        const { mountManagementSection } = await import('./app/mount_management_section');
        return mountManagementSection(
          coreSetup,
          params,
          this.isServerless,
          this.experimentalFeatures
        );
      },
    });
    registerFeature(home);

    if (triggersActionsUi) {
      triggersActionsUi.ruleTypeRegistry.register(getTransformHealthRuleType());
    }
  }

  public start() {}
  public stop() {}
}
