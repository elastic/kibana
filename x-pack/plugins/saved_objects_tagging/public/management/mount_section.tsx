/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { I18nProvider } from '@kbn/i18n/react';
import type { FC } from 'react';
import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreSetup } from '../../../../../src/core/public/types';
import type { ApplicationStart } from '../../../../../src/core/public/application/types';
import type { ManagementAppMountParams } from '../../../../../src/plugins/management/public/types';
import type { ITagsCache } from '../../../../../src/plugins/saved_objects_tagging_oss/public/api';
import { getTagsCapabilities } from '../../common/capabilities';
import type { ITagAssignmentService } from '../services/assignments/assignment_service';
import type { ITagInternalClient } from '../services/tags/tags_client';
import type { SavedObjectTaggingPluginStart } from '../types';
import { TagManagementPage } from './tag_management_page';

interface MountSectionParams {
  tagClient: ITagInternalClient;
  tagCache: ITagsCache;
  assignmentService: ITagAssignmentService;
  core: CoreSetup<{}, SavedObjectTaggingPluginStart>;
  mountParams: ManagementAppMountParams;
  title: string;
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
  title,
}: MountSectionParams) => {
  const [coreStart] = await core.getStartServices();
  const { element, setBreadcrumbs } = mountParams;
  const capabilities = getTagsCapabilities(coreStart.application.capabilities);
  const assignableTypes = await assignmentService.getAssignableTypes();
  coreStart.chrome.docTitle.change(title);

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
    coreStart.chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(element);
  };
};
