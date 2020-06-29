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

export interface TagsPluginSetupDependencies {
  management: ManagementSetup;
}

export interface TagsPluginStartDependencies {
  management: ManagementStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TagsPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TagsPluginStart {}

export class TagsPlugin
  implements
    Plugin<
      TagsPluginSetup,
      TagsPluginStart,
      TagsPluginSetupDependencies,
      TagsPluginStartDependencies
    > {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<TagsPluginStartDependencies, unknown>,
    plugins: TagsPluginSetupDependencies
  ): TagsPluginSetup {
    const kibanaSection = plugins.management.sections.getSection(ManagementSectionId.Kibana);

    kibanaSection.registerApp({
      id: 'tags',
      euiIconType: 'tag',
      order: 0,
      title: i18n.translate('xpack.tags.Tags', {
        defaultMessage: 'Tags',
      }),
      mount: ({ element, history, setBreadcrumbs }) => {
        const services = new TagsManagementServices({ history, setBreadcrumbs });
        render(h(TagsManagementSection, { services }), element);
        return () => {
          unmountComponentAtNode(element);
        };
      },
    });

    return {};
  }

  public start(core: CoreStart, plugins: TagsPluginStartDependencies): TagsPluginStart {
    return {};
  }
}
