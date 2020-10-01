/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { CoreSetup } from 'src/core/public';
import { ManagementAppMountParams } from '../../../../../src/plugins/management/public';
import { SavedObjectTaggingPluginStart } from '../types';
import { TagManagementPage } from './tag_management_page';

interface MountSectionParams {
  core: CoreSetup<{}, SavedObjectTaggingPluginStart>;
  mountParams: ManagementAppMountParams;
}

export const mountSection = async ({ core, mountParams }: MountSectionParams) => {
  const [{ overlays }, {}, pluginStart] = await core.getStartServices();
  const { element, setBreadcrumbs } = mountParams;
  const { tags } = pluginStart;
  ReactDOM.render(
    <I18nProvider>
      <TagManagementPage setBreadcrumbs={setBreadcrumbs} overlays={overlays} tagClient={tags} />
    </I18nProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
