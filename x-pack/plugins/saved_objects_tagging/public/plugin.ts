/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, PluginInitializerContext, Plugin } from 'src/core/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';
import { tagManagementSectionId } from '../common/constants';
import { SavedObjectTaggingPluginStart } from './types';
import { TagsClient } from './tags';

interface SetupDeps {
  management: ManagementSetup;
}

export class SavedObjectTaggingPlugin
  implements Plugin<{}, SavedObjectTaggingPluginStart, SetupDeps, {}> {
  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup, { management }: SetupDeps) {
    const kibanaSection = management.sections.section.kibana;
    kibanaSection.registerApp({
      id: tagManagementSectionId,
      title: i18n.translate('xpack.tags.managementSectionLabel', {
        defaultMessage: 'Tags',
      }),
      order: 2,
      mount: async (mountParams) => {
        const { mountSection } = await import('./management');
        return mountSection({
          mountParams,
        });
      },
    });

    return {};
  }

  public start({ http }: CoreStart) {
    const tags = new TagsClient({ http });

    return {
      tags,
    };
  }
}
