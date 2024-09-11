/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useState } from 'react';

import type { ScopedHistory } from '@kbn/core-application-browser';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';

import { EditSpaceEnabledFeatures } from './edit_space_features_tab';
import { EditSpaceTabFooter } from './footer';
import { useEditSpaceServices } from './provider';
import type { Space } from '../../../common';
import { ConfirmDeleteModal } from '../components';
import { ConfirmAlterActiveSpaceModal } from '../components/confirm_alter_active_space_modal';
import { CustomizeSpace } from '../components/customize_space';
import { SolutionView } from '../components/solution_view';
import { SpaceValidator } from '../lib';
import type { FormValues } from '../types';

interface Props {
  space: Space;
  history: ScopedHistory;
  features: KibanaFeature[];
  allowFeatureVisibility: boolean;
  allowSolutionVisibility: boolean;
  reloadWindow: () => void;
}

export const EditSpaceSettingsTab: React.FC<Props> = ({ space, features, history, ...props }) => {
  const [spaceSettings, setSpaceSettings] = useState<Partial<Space>>(space);
  const [isDirty, setIsDirty] = useState(false); // track if unsaved changes have been made
  const [isLoading, setIsLoading] = useState(false); // track if user has just clicked the Update button
  const [showUserImpactWarning, setShowUserImpactWarning] = useState(false);
  const [showAlteringActiveSpaceDialog, setShowAlteringActiveSpaceDialog] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const { http, overlays, notifications, navigateToUrl, spacesManager } = useEditSpaceServices();

  const [solution, setSolution] = useState<typeof space.solution | undefined>(space.solution);

  useUnsavedChangesPrompt({
    hasUnsavedChanges: isDirty,
    http,
    openConfirm: overlays.openConfirm,
    navigateToUrl,
    history,
  });

  const onChangeSpaceSettings = useCallback(
    (formValues: FormValues & Partial<Space>) => {
      const {
        customIdentifier,
        avatarType,
        customAvatarInitials,
        customAvatarColor,
        ...updatedSpace
      } = formValues;
      setSpaceSettings({ ...spaceSettings, ...updatedSpace });
      setIsDirty(true);
    },
    [spaceSettings]
  );

  const onChangeFeatures = useCallback(
    (updatedSpace: Partial<Space>) => {
      setSpaceSettings({ ...spaceSettings, ...updatedSpace });
      setIsDirty(true);
      setShowUserImpactWarning(true);
    },
    [spaceSettings]
  );

  const onSolutionViewChange = useCallback(
    (updatedSpace: Partial<Space>) => {
      setSolution(updatedSpace.solution);
      onChangeFeatures(updatedSpace);
    },
    [onChangeFeatures]
  );

  const backToSpacesList = useCallback(() => {
    history.push('/');
  }, [history]);

  const onClickCancel = useCallback(() => {
    setShowAlteringActiveSpaceDialog(false);
    setShowUserImpactWarning(false);
    backToSpacesList();
  }, [backToSpacesList]);

  const onClickDeleteSpace = useCallback(() => {
    setShowConfirmDeleteModal(true);
  }, []);

  const performSave = useCallback(
    async ({ requiresReload = false }) => {
      const { id, name, disabledFeatures } = spaceSettings;
      if (!id) {
        throw new Error(`Can not update space without id field!`);
      }
      if (!name) {
        throw new Error(`Can not update space without name field!`);
      }

      setIsLoading(true);

      try {
        await spacesManager.updateSpace({
          id,
          name,
          disabledFeatures: disabledFeatures ?? [],
          ...spaceSettings,
        });

        notifications.toasts.addSuccess(
          i18n.translate(
            'xpack.spaces.management.spaceDetails.spaceSuccessfullySavedNotificationMessage',
            {
              defaultMessage: 'Space "{name}" was saved.',
              values: { name },
            }
          )
        );

        setIsDirty(false);
        backToSpacesList();
        if (requiresReload) {
          props.reloadWindow();
        }
      } catch (error) {
        console.error('Could not save changes to space!', error); // eslint-disable-line no-console
        const message = error?.body?.message ?? error.toString();
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.spaces.management.spaceDetails.errorSavingSpaceTitle', {
            defaultMessage: 'Error saving space: {message}',
            values: { message },
          }),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [backToSpacesList, notifications.toasts, spaceSettings, spacesManager, props]
  );

  const onClickSubmit = useCallback(() => {
    if (showUserImpactWarning) {
      setShowAlteringActiveSpaceDialog(true);
    } else {
      performSave({ requiresReload: false });
    }
  }, [performSave, showUserImpactWarning]);

  const doShowAlteringActiveSpaceDialog = () => {
    return (
      showAlteringActiveSpaceDialog && (
        <ConfirmAlterActiveSpaceModal
          onConfirm={() => performSave({ requiresReload: true })}
          onCancel={() => {
            setShowAlteringActiveSpaceDialog(false);
          }}
        />
      )
    );
  };

  const doShowConfirmDeleteSpaceDialog = () => {
    return (
      showConfirmDeleteModal && (
        <ConfirmDeleteModal
          space={space}
          spacesManager={spacesManager}
          onCancel={() => {
            setShowConfirmDeleteModal(false);
          }}
          onSuccess={() => {
            setShowConfirmDeleteModal(false);
            backToSpacesList();
          }}
        />
      )
    );
  };

  // Show if user has changed disabled features
  // Show if user has changed solution view
  const doShowUserImpactWarning = () => {
    return (
      showUserImpactWarning && (
        <>
          <EuiSpacer />
          <EuiCallOut
            color="warning"
            iconType="help"
            title="Warning"
            data-test-subj="space-edit-page-user-impact-warning"
          >
            {i18n.translate(
              'xpack.spaces.management.spaceDetails.spaceChangesWarning.impactAllUsersInSpace',
              {
                defaultMessage: 'The changes made will impact all users in the space.',
              }
            )}
          </EuiCallOut>
        </>
      )
    );
  };

  const validator = new SpaceValidator();

  return (
    <>
      {doShowAlteringActiveSpaceDialog()}
      {doShowConfirmDeleteSpaceDialog()}

      <CustomizeSpace
        space={spaceSettings}
        onChange={onChangeSpaceSettings}
        editingExistingSpace={true}
        validator={validator}
      />

      {props.allowSolutionVisibility && (
        <>
          <EuiSpacer />
          <SolutionView
            space={spaceSettings}
            onChange={onSolutionViewChange}
            validator={validator}
            isEditing={true}
          />
        </>
      )}

      {props.allowFeatureVisibility && (solution == null || solution === 'classic') && (
        <>
          <EuiSpacer />
          <EditSpaceEnabledFeatures
            features={features}
            space={spaceSettings}
            onChange={onChangeFeatures}
          />
        </>
      )}

      {doShowUserImpactWarning()}

      <EuiSpacer />
      <EditSpaceTabFooter
        isDirty={isDirty}
        isLoading={isLoading}
        onClickCancel={onClickCancel}
        onClickSubmit={onClickSubmit}
        onClickDeleteSpace={onClickDeleteSpace}
      />
    </>
  );
};
