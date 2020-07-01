/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createElement as h } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
} from '../../../../src/core/public';
import {
  ManagementSetup,
  ManagementStart,
  ManagementSectionId,
} from '../../../../src/plugins/management/public';
import { TagsManagementServices, TagsManagementSection } from './management';
import {
  TagsService,
  TagsServiceSetup,
  TagsServiceStart,
  TagAttachmentsService,
  TagAttachmentsServiceSetup,
  TagAttachmentsServiceStart,
} from './services';

export interface TagsPluginSetupDependencies {
  management: ManagementSetup;
}

export interface TagsPluginStartDependencies {
  management: ManagementStart;
}

export interface TagsPluginSetup {
  tags: TagsServiceSetup;
  attachments: TagAttachmentsServiceSetup;
}

export interface TagsPluginStart {
  tags: TagsServiceStart;
  attachments: TagAttachmentsServiceStart;
}

export class TagsPlugin
  implements
    Plugin<
      TagsPluginSetup,
      TagsPluginStart,
      TagsPluginSetupDependencies,
      TagsPluginStartDependencies
    > {
  private readonly tagsService = new TagsService();
  private readonly attachmentsService = new TagAttachmentsService();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<TagsPluginStartDependencies, unknown>,
    plugins: TagsPluginSetupDependencies
  ): TagsPluginSetup {
    const { http, notifications } = core;

    const tags = this.tagsService.setup({ http });
    const attachments = this.attachmentsService.setup({ http });

    const kibanaSection = plugins.management.sections.getSection(ManagementSectionId.Kibana);

    kibanaSection.registerApp({
      id: 'tags',
      euiIconType: 'tag',
      order: 0,
      title: i18n.translate('xpack.tags.Tags', {
        defaultMessage: 'Tags',
      }),
      mount: ({ element, history, setBreadcrumbs }) => {
        const services = new TagsManagementServices({
          history,
          setBreadcrumbs,
          tags,
          attachments,
          toasts: notifications.toasts,
        });
        render(h(TagsManagementSection, { services }), element);
        return () => {
          unmountComponentAtNode(element);
        };
      },
    });

    return {
      tags,
      attachments,
    };
  }

  public start(core: CoreStart, plugins: TagsPluginStartDependencies): TagsPluginStart {
    return {
      tags: this.tagsService.start(),
      attachments: this.attachmentsService.start(),
    };
  }
}
