/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { AddFieldFilterHandler } from '@kbn/unified-field-list-plugin/public';
import { showCategorizeFlyout } from './shared_flyout';

import {
  AiopsPluginSetup,
  AiopsPluginSetupDeps,
  AiopsPluginStart,
  AiopsPluginStartDeps,
} from './types';

export class AiopsPlugin
  implements Plugin<AiopsPluginSetup, AiopsPluginStart, AiopsPluginSetupDeps, AiopsPluginStartDeps>
{
  public setup(
    core: CoreSetup<AiopsPluginStartDeps, AiopsPluginSetupDeps>,
    plugins: AiopsPluginSetupDeps
  ) {
    plugins.unifiedFieldList.extraFieldOptions.register(
      (field: DataViewField, dataView: DataView, onAddFilter?: AddFieldFilterHandler) => {
        return {
          icon: 'editorOrderedList',
          title: i18n.translate('unifiedFieldList.fieldPopover.addExistsFilterLabel', {
            defaultMessage: 'Categorize field',
          }),
          onClick: async () => {
            const [coreStart, { data, charts }] = await core.getStartServices();
            showCategorizeFlyout(field, dataView, coreStart, data, charts, onAddFilter);
            // console.log(field);
          },
          canShow: () => field.esTypes !== undefined && field.esTypes.includes('text'),
        };
      }
    );
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
