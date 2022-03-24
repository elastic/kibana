/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n as kbnI18n } from '@kbn/i18n';

import type { CoreSetup } from 'src/core/public';
import type { DataPublicPluginStart } from 'src/plugins/data/public';
import type { HomePublicPluginSetup } from 'src/plugins/home/public';
import type { SavedObjectsStart } from 'src/plugins/saved_objects/public';
import type { ManagementSetup } from 'src/plugins/management/public';
import type { SharePluginStart } from 'src/plugins/share/public';
import type { SpacesApi } from '../../spaces/public';
import { registerFeature } from './register_feature';
import type { PluginSetupContract as AlertingSetup } from '../../alerting/public';
import type { TriggersAndActionsUIPublicPluginStart } from '../../triggers_actions_ui/public';
import { getTransformHealthRuleType } from './alerting';

export interface PluginsDependencies {
  data: DataPublicPluginStart;
  management: ManagementSetup;
  home: HomePublicPluginSetup;
  savedObjects: SavedObjectsStart;
  share: SharePluginStart;
  spaces?: SpacesApi;
  alerting?: AlertingSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export class TransformUiPlugin {
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
        return mountManagementSection(coreSetup, params);
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
