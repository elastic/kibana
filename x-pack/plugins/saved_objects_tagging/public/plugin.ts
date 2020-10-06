/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, PluginInitializerContext, Plugin } from 'src/core/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';
import { SavedObjectTaggingOssPluginSetup } from '../../../../src/plugins/saved_objects_tagging_oss/public';
import { tagManagementSectionId } from '../common/constants';
import { SavedObjectTaggingPluginStart } from './types';
import { TagsClient, TagsCache } from './tags';
import { getApiComponents } from './ui_components';

interface SetupDeps {
  management: ManagementSetup;
  savedObjectsTaggingOss: SavedObjectTaggingOssPluginSetup;
}

export class SavedObjectTaggingPlugin
  implements Plugin<{}, SavedObjectTaggingPluginStart, SetupDeps, {}> {
  private tagClient?: TagsClient;

  constructor(context: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<{}, SavedObjectTaggingPluginStart>,
    { management, savedObjectsTaggingOss }: SetupDeps
  ) {
    const kibanaSection = management.sections.section.kibana;
    kibanaSection.registerApp({
      id: tagManagementSectionId,
      title: i18n.translate('xpack.savedObjectsTagging.management.sectionLabel', {
        defaultMessage: 'Tags',
      }),
      order: 2,
      mount: async (mountParams) => {
        const { mountSection } = await import('./management');
        return mountSection({
          tagClient: this.tagClient!,
          core,
          mountParams,
        });
      },
    });

    savedObjectsTaggingOss.registerTaggingApi(
      core.getStartServices().then(([c, d, startContract]) => startContract)
    );

    return {};
  }

  public start({ http }: CoreStart) {
    const tagCache = new TagsCache(() => this.tagClient!.getAll());
    this.tagClient = new TagsClient({ http, changeListener: tagCache });

    tagCache.populate();

    return {
      client: this.tagClient,
      ui: getApiComponents({ cache: tagCache }),
    };
  }
}
