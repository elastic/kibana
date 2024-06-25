/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type MlPluginSetup } from '@kbn/ml-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginStart as TriggersActionsStart,
  TriggersAndActionsUIPublicPluginSetup,
} from '@kbn/triggers-actions-ui-plugin/public';

export interface ElasticAssistantPluginSetupDependencies {
  ml: MlPluginSetup;
  spaces?: SpacesPluginSetup;
  licensing: LicensingPluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
}
export interface ElasticAssistantPluginStartDependencies {
  licensing: LicensingPluginStart;
  triggersActionsUi: TriggersActionsStart;
  spaces?: SpacesPluginStart;
  security: SecurityPluginStart;
}

export type StartServices = CoreStart &
  ElasticAssistantPluginStartDependencies & {
    storage: Storage;
  };
