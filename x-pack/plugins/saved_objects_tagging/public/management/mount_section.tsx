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
import { ITagInternalClient } from '../tags';
import { TagManagementPage } from './tag_management_page';

interface MountSectionParams {
  tagClient: ITagInternalClient;
  core: CoreSetup<{}, SavedObjectTaggingPluginStart>;
  mountParams: ManagementAppMountParams;
}

export const mountSection = async ({ tagClient, core, mountParams }: MountSectionParams) => {
  const [{ overlays }] = await core.getStartServices();
  const { element, setBreadcrumbs } = mountParams;
  ReactDOM.render(
    <I18nProvider>
      <TagManagementPage
        setBreadcrumbs={setBreadcrumbs}
        overlays={overlays}
        tagClient={tagClient}
      />
    </I18nProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
