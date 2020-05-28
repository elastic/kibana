/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { TriggersAndActionsUIPublicPluginSetup } from '../../../plugins/triggers_actions_ui/public';
import { DataEnhancedStart } from '../../data_enhanced/public';

export interface ClientPluginsSetup {
  home: HomePublicPluginSetup;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
}

export interface ClientPluginsStart {
  data: DataPublicPluginStart;
  dataEnhanced: DataEnhancedStart;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
}
