/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SaveResult } from '@kbn/saved-objects-plugin/public';
import { showSaveModal } from '@kbn/saved-objects-plugin/public';
import { ContentClient } from '@kbn/content-management-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { GraphWorkspaceSavedObject, GraphSavePolicy } from '../types';
import { SaveModal, OnSaveGraphProps } from '../components/save_modal';

export interface SaveWorkspaceServices
  extends Pick<CoreStart, 'overlays' | 'analytics' | 'i18n' | 'theme'> {
  contentClient: ContentClient;
}

export type SaveWorkspaceHandler = (
  saveOptions: {
    confirmOverwrite: boolean;
    isTitleDuplicateConfirmed: boolean;
    onTitleDuplicate: () => void;
  },
  dataConsent: boolean,
  services: SaveWorkspaceServices
) => Promise<SaveResult>;

export function openSaveModal({
  savePolicy,
  hasData,
  workspace,
  saveWorkspace,
  services,
}: {
  savePolicy: GraphSavePolicy;
  hasData: boolean;
  workspace: GraphWorkspaceSavedObject;
  saveWorkspace: SaveWorkspaceHandler;
  services: SaveWorkspaceServices;
}) {
  const currentTitle = workspace.title;
  const currentDescription = workspace.description;
  const onSave = ({
    newTitle,
    newDescription,
    newCopyOnSave,
    isTitleDuplicateConfirmed,
    onTitleDuplicate,
    dataConsent,
  }: OnSaveGraphProps) => {
    workspace.title = newTitle;
    workspace.description = newDescription;
    workspace.copyOnSave = newCopyOnSave;
    const saveOptions = {
      confirmOverwrite: false,
      isTitleDuplicateConfirmed,
      onTitleDuplicate,
    };
    return saveWorkspace(saveOptions, dataConsent, services).then((response) => {
      // If the save wasn't successful, put the original values back.
      if (!('id' in response) || !Boolean(response.id)) {
        workspace.title = currentTitle;
        workspace.description = currentDescription;
      }
      return response;
    });
  };
  showSaveModal(
    <SaveModal
      savePolicy={savePolicy}
      hasData={hasData}
      onSave={onSave}
      onClose={() => {}}
      title={workspace.title}
      description={workspace.description}
      showCopyOnSave={Boolean(workspace.id)}
    />
  );
}
