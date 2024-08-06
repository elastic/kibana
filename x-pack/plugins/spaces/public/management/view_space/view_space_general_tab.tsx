/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React, { useState } from 'react';

import type { ScopedHistory } from '@kbn/core-application-browser';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';

import { ViewSpaceTabFooter } from './footer';
import { useViewSpaceServices } from './hooks/view_space_context_provider';
import { ViewSpaceEnabledFeatures } from './view_space_features_tab';
import type { Space } from '../../../common';
import { ConfirmAlterActiveSpaceModal } from '../edit_space/confirm_alter_active_space_modal';
import { CustomizeSpace } from '../edit_space/customize_space';
import type { FormValues } from '../edit_space/manage_space_page';
import { SolutionView } from '../edit_space/solution_view';
import { SpaceValidator } from '../lib';

interface Props {
  space: Space;
  history: ScopedHistory;
  features: KibanaFeature[];
}

export const ViewSpaceSettings: React.FC<Props> = ({ space, features, history }) => {
  const [spaceSettings, setSpaceSettings] = useState<Partial<Space>>(space);
  const [isDirty, setIsDirty] = useState(false); // track if unsaved changes have been made
  const [isLoading, setIsLoading] = useState(false); // track if user has just clicked the Update button
  const [shouldShowUserImpactWarning, setShouldShowUserImpactWarning] = useState(false);
  const [shouldShowAlteringActiveSpaceDialog, setShouldShowAlteringActiveSpaceDialog] =
    useState(false);

  const { http, overlays, navigateToUrl, spacesManager } = useViewSpaceServices();

  const { solution } = space;
  const shouldShowFeaturesVisibility = !solution || solution === 'classic';

  const validator = new SpaceValidator();

  useUnsavedChangesPrompt({
    hasUnsavedChanges: isDirty,
    http,
    openConfirm: overlays.openConfirm,
    navigateToUrl,
    history,
  });

  const onChangeSpaceSettings = (formValues: FormValues & Partial<Space>) => {
    const {
      customIdentifier,
      avatarType,
      customAvatarInitials,
      customAvatarColor,
      ...updatedSpace
    } = formValues;
    setSpaceSettings(updatedSpace);
    setIsDirty(true);
  };

  const onChangeFeatures = (updatedSpace: Partial<Space>) => {
    setSpaceSettings(updatedSpace);
    setIsDirty(true);
    setShouldShowUserImpactWarning(true);
  };

  const onSubmit = () => {
    if (shouldShowUserImpactWarning) {
      setShouldShowAlteringActiveSpaceDialog(true);
    } else {
      performSave({ requiresReload: false });
    }
  };

  const onCancel = () => {
    setSpaceSettings(space);
    setShouldShowAlteringActiveSpaceDialog(false);
    setShouldShowUserImpactWarning(false);
    setIsDirty(false);
    setIsLoading(false);
  };

  // TODO cancel previous request, if there is one pending
  // TODO flush analytics
  // TODO error handling
  const performSave = async ({ requiresReload = false }) => {
    const { id, name, disabledFeatures } = spaceSettings;
    if (!id) {
      throw new Error(`Can not update space without id field!`);
    }
    if (!name) {
      throw new Error(`Can not update space without name field!`);
    }

    setIsLoading(true);

    await spacesManager.updateSpace({
      id,
      name,
      disabledFeatures: disabledFeatures ?? [],
      ...spaceSettings,
    });

    setIsDirty(false);

    if (requiresReload) {
      window.location.reload();
    }

    setIsLoading(false);
  };

  const doShowAlteringActiveSpaceDialog = () => {
    return (
      shouldShowAlteringActiveSpaceDialog && (
        <ConfirmAlterActiveSpaceModal
          onConfirm={() => performSave({ requiresReload: true })}
          onCancel={() => {
            setShouldShowAlteringActiveSpaceDialog(false);
          }}
        />
      )
    );
  };

  // Show if user has changed disabled features
  // Show if user has changed solution view
  const doShowUserImpactWarning = () => {
    return (
      shouldShowUserImpactWarning && (
        <>
          <EuiSpacer />
          <EuiCallOut
            color="warning"
            iconType="help"
            title="Warning"
            data-test-subj="userImpactWarning"
          >
            {' '}
            The changes made will impact all users in the space.{' '}
          </EuiCallOut>
        </>
      )
    );
  };

  return (
    <>
      {doShowAlteringActiveSpaceDialog()}

      <CustomizeSpace
        space={spaceSettings}
        onChange={onChangeSpaceSettings}
        editingExistingSpace={true}
        validator={validator}
      />

      <EuiSpacer />
      <SolutionView space={spaceSettings} onChange={onChangeFeatures} />

      {shouldShowFeaturesVisibility && (
        <>
          <EuiSpacer />
          <ViewSpaceEnabledFeatures
            features={features}
            space={spaceSettings}
            onChange={onChangeFeatures}
          />
        </>
      )}

      {doShowUserImpactWarning()}

      <EuiSpacer />
      <ViewSpaceTabFooter
        isDirty={isDirty}
        isLoading={isLoading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </>
  );
};
