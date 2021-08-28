/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { CoreSetup, CoreStart } from '../../../../src/core/public/types';
import type { Plugin } from '../../../../src/core/public/plugins/plugin';
import type { PluginInitializerContext } from '../../../../src/core/public/plugins/plugin_context';
import type { ManagementSetup } from '../../../../src/plugins/management/public/types';
import type { SavedObjectTaggingOssPluginSetup } from '../../../../src/plugins/saved_objects_tagging_oss/public/types';
import { getTagsCapabilities } from '../common/capabilities';
import { tagManagementSectionId } from '../common/constants';
import type { SavedObjectsTaggingClientConfigRawType } from './config';
import { SavedObjectsTaggingClientConfig } from './config';
import { TagAssignmentService } from './services/assignments/assignment_service';
import { TagsCache } from './services/tags/tags_cache';
import { TagsClient } from './services/tags/tags_client';
import type { SavedObjectTaggingPluginStart } from './types';
import { getUiApi } from './ui_api';

interface SetupDeps {
  management: ManagementSetup;
  savedObjectsTaggingOss: SavedObjectTaggingOssPluginSetup;
}

export class SavedObjectTaggingPlugin
  implements Plugin<{}, SavedObjectTaggingPluginStart, SetupDeps, {}> {
  private tagClient?: TagsClient;
  private tagCache?: TagsCache;
  private assignmentService?: TagAssignmentService;
  private readonly config: SavedObjectsTaggingClientConfig;

  constructor(context: PluginInitializerContext) {
    this.config = new SavedObjectsTaggingClientConfig(
      context.config.get<SavedObjectsTaggingClientConfigRawType>()
    );
  }

  public setup(
    core: CoreSetup<{}, SavedObjectTaggingPluginStart>,
    { management, savedObjectsTaggingOss }: SetupDeps
  ) {
    const kibanaSection = management.sections.section.kibana;
    const title = i18n.translate('xpack.savedObjectsTagging.management.sectionLabel', {
      defaultMessage: 'Tags',
    });
    kibanaSection.registerApp({
      id: tagManagementSectionId,
      title,
      order: 1.5,
      mount: async (mountParams) => {
        const { mountSection } = await import('./management');
        return mountSection({
          tagClient: this.tagClient!,
          tagCache: this.tagCache!,
          assignmentService: this.assignmentService!,
          core,
          mountParams,
          title,
        });
      },
    });

    savedObjectsTaggingOss.registerTaggingApi(
      core.getStartServices().then(([_core, _deps, startContract]) => startContract)
    );

    return {};
  }

  public start({ http, application, overlays }: CoreStart) {
    this.tagCache = new TagsCache({
      refreshHandler: () => this.tagClient!.getAll({ asSystemRequest: true }),
      refreshInterval: this.config.cacheRefreshInterval,
    });
    this.tagClient = new TagsClient({ http, changeListener: this.tagCache });
    this.assignmentService = new TagAssignmentService({ http });

    // do not fetch tags on anonymous page
    if (!http.anonymousPaths.isAnonymous(window.location.pathname)) {
      // we don't need to wait for this to resolve.
      this.tagCache.initialize().catch(() => {
        // cache is resilient to initial load failure. We just need to catch to avoid unhandled promise rejection
      });
    }

    return {
      client: this.tagClient,
      cache: this.tagCache,
      ui: getUiApi({
        cache: this.tagCache,
        client: this.tagClient,
        capabilities: getTagsCapabilities(application.capabilities),
        overlays,
      }),
    };
  }

  public stop() {
    if (this.tagCache) {
      this.tagCache.stop();
    }
  }
}
