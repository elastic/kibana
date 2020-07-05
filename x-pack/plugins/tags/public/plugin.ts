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
  DEFAULT_APP_CATEGORIES,
  AppMountParameters,
} from '../../../../src/core/public';
import {
  ManagementSetup,
  ManagementStart,
  ManagementSectionId,
} from '../../../../src/plugins/management/public';
import {
  ExtensionsPluginSetup,
  ExtensionsPluginStart,
} from '../../../../src/plugins/extensions/public';
import { TagsManagementServices, TagsManagementSection } from './management';
import { TagsService, TagsServiceContract, KidService } from './services';
import { Tag, TagProps } from './containers/tag';
import { createTagsProvider } from './context';
import { TagListProps, TagList } from './containers/tag_list';
import { TagPickerProps, TagPicker } from './containers/tag_picker';
import { TagListEditableProps, TagListEditable } from './containers/tag_list_editable';
import { TagsApp } from './application';
import { TagsAppServices } from './application/services';

export interface TagsPluginSetupDependencies {
  extensions: ExtensionsPluginSetup;
  management: ManagementSetup;
}

export interface TagsPluginStartDependencies {
  extensions: ExtensionsPluginStart;
  management: ManagementStart;
}

export interface TagsPluginSetup {
  tags: TagsServiceContract;
  ui: {
    Provider: React.ComponentType;
    Tag: React.ComponentType<TagProps>;
    TagList: React.ComponentType<TagListProps>;
    TagPicker: React.ComponentType<TagPickerProps>;
    TagListEditable: React.ComponentType<TagListEditableProps>;
  };
}

export interface TagsPluginStart {
  tags: TagsServiceContract;
  ui: {
    Provider: React.ComponentType;
    Tag: React.ComponentType<TagProps>;
    TagList: React.ComponentType<TagListProps>;
    TagPicker: React.ComponentType<TagPickerProps>;
    TagListEditable: React.ComponentType<TagListEditableProps>;
  };
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
  private readonly kid = new KidService();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<TagsPluginStartDependencies, unknown>,
    plugins: TagsPluginSetupDependencies
  ): TagsPluginSetup {
    const { http, notifications } = core;

    const tags = this.tagsService.setup({ http });

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
          toasts: notifications.toasts,
        });
        render(h(TagsManagementSection, { services }), element);
        return () => {
          unmountComponentAtNode(element);
        };
      },
    });

    const Provider = createTagsProvider(tags);

    core.application.register({
      id: 'tags',
      title: 'Tags',
      icon: 'tag',
      order: 1,
      category: DEFAULT_APP_CATEGORIES.management,
      mount: async ({ element }: AppMountParameters) => {
        const services = new TagsAppServices({ tags, kid: this.kid });
        render(h(TagsApp, { services }), element);
        return () => {
          unmountComponentAtNode(element);
        };
      },
    });

    const setup: TagsPluginSetup = {
      tags,
      ui: {
        Provider,
        Tag: (props) => h(Provider, {}, h(Tag, props)),
        TagList: (props) => h(Provider, {}, h(TagList, props)),
        TagPicker: (props) => h(Provider, {}, h(TagPicker, props)),
        TagListEditable: (props) => h(Provider, {}, h(TagListEditable, props)),
      },
    };

    plugins.extensions.tags.TagList = setup.ui.TagList;
    plugins.extensions.tags.TagListEditable = setup.ui.TagListEditable;

    return setup;
  }

  public start(core: CoreStart, plugins: TagsPluginStartDependencies): TagsPluginStart {
    const tags = this.tagsService;
    const Provider = createTagsProvider(tags);

    return {
      tags,
      ui: {
        Provider,
        Tag: (props) => h(Provider, {}, h(Tag, props)),
        TagList: (props) => h(Provider, {}, h(TagList, props)),
        TagPicker: (props) => h(Provider, {}, h(TagPicker, props)),
        TagListEditable: (props) => h(Provider, {}, h(TagListEditable, props)),
      },
    };
  }
}
