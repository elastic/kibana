/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import type { ScopedHistory } from '@kbn/core-application-browser';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';

import { ViewSpaceTabFooter } from './footer';
import { useViewSpaceServices } from './hooks/view_space_context_provider';
import type { Space } from '../../../common';
import { CustomizeSpace } from '../edit_space/customize_space';
import { SpaceValidator } from '../lib';

interface Props {
  space: Space;
  history: ScopedHistory;
}

export const ViewSpaceSettings: React.FC<Props> = ({ space, ...props }) => {
  const [spaceSettings, setSpaceSettings] = useState<Partial<Space>>(space);
  const [isDirty, setIsDirty] = useState(false); // track if unsaved changes have been made
  const [isLoading, setIsLoading] = useState(false); // track if user has just clicked the Update button

  const { http, overlays, navigateToUrl, spacesManager } = useViewSpaceServices();

  useUnsavedChangesPrompt({
    hasUnsavedChanges: isDirty,
    http,
    openConfirm: overlays.openConfirm,
    navigateToUrl,
    history: props.history,
  });

  const validator = new SpaceValidator();

  const onChangeSpaceSettings = (updatedSpace: Partial<Space>) => {
    setSpaceSettings(updatedSpace);
    setIsDirty(true);
  };

  const onUpdateSpace = async () => {
    const { id, name, disabledFeatures } = spaceSettings;
    if (!id) {
      throw new Error(`Can not update space without id field!`);
    }
    if (!name) {
      throw new Error(`Can not update space without name field!`);
    }

    // TODO cancel previous request, if there is one pending
    await spacesManager.updateSpace({
      id,
      name,
      disabledFeatures: disabledFeatures ?? [],
      ...spaceSettings,
    });

    // TODO error handling
    setIsDirty(false);
  };

  const onCancel = () => {
    setSpaceSettings(space);
    setIsDirty(false);
  };

  return (
    <>
      <CustomizeSpace
        space={spaceSettings}
        onChange={onChangeSpaceSettings}
        editingExistingSpace={true}
        validator={validator}
      />

      <ViewSpaceTabFooter
        isDirty={isDirty}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        onCancel={onCancel}
        onUpdateSpace={onUpdateSpace}
      />
    </>
  );
};
