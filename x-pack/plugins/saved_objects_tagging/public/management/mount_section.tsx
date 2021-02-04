/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { CoreSetup, ApplicationStart } from 'src/core/public';
import { ManagementAppMountParams } from '../../../../../src/plugins/management/public';
import { getTagsCapabilities } from '../../common';
import { SavedObjectTaggingPluginStart } from '../types';
import { ITagInternalClient, ITagAssignmentService, ITagsCache } from '../services';
import { TagManagementPage } from './tag_management_page';

interface MountSectionParams {
  tagClient: ITagInternalClient;
  tagCache: ITagsCache;
  assignmentService: ITagAssignmentService;
  core: CoreSetup<{}, SavedObjectTaggingPluginStart>;
  mountParams: ManagementAppMountParams;
}

const RedirectToHomeIfUnauthorized: FC<{
  applications: ApplicationStart;
}> = ({ applications, children }) => {
  const allowed = applications.capabilities?.management?.kibana?.tags ?? false;
  if (!allowed) {
    applications.navigateToApp('home');
    return null;
  }
  return children! as React.ReactElement;
};

export const mountSection = async ({
  tagClient,
  tagCache,
  assignmentService,
  core,
  mountParams,
}: MountSectionParams) => {
  const [coreStart] = await core.getStartServices();
  const { element, setBreadcrumbs } = mountParams;
  const capabilities = getTagsCapabilities(coreStart.application.capabilities);
  const assignableTypes = await assignmentService.getAssignableTypes();

  ReactDOM.render(
    <I18nProvider>
      <RedirectToHomeIfUnauthorized applications={coreStart.application}>
        <TagManagementPage
          setBreadcrumbs={setBreadcrumbs}
          core={coreStart}
          tagClient={tagClient}
          tagCache={tagCache}
          assignmentService={assignmentService}
          capabilities={capabilities}
          assignableTypes={assignableTypes}
        />
      </RedirectToHomeIfUnauthorized>
    </I18nProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
