/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import classNames from 'classnames';
import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiTitle,
  EuiSpacer,
  EuiPanel,
  EuiConfirmModal,
} from '@elastic/eui';

import { LicensingLogic } from '../../../shared/licensing';
import { UnsavedChangesPrompt } from '../../../shared/unsaved_changes_prompt';
import { WorkplaceSearchPageTemplate } from '../../components/layout';
import { LicenseCallout } from '../../components/shared/license_callout';
import {
  SECURITY_UNSAVED_CHANGES_MESSAGE,
  RESET_BUTTON,
  SAVE_SETTINGS_BUTTON,
  SAVE_CHANGES_BUTTON,
  KEEP_EDITING_BUTTON,
  PRIVATE_SOURCES,
  PRIVATE_SOURCES_DESCRIPTION,
  PRIVATE_SOURCES_TOGGLE_DESCRIPTION,
  PRIVATE_PLATINUM_LICENSE_CALLOUT,
  CONFIRM_CHANGES_TEXT,
  PRIVATE_SOURCES_UPDATE_CONFIRMATION_TEXT,
  NAV,
} from '../../constants';

import { PrivateSourcesTable } from './components/private_sources_table';
import { SecurityLogic } from './security_logic';

export const Security: React.FC = () => {
  const [confirmModalVisible, setConfirmModalVisibility] = useState(false);

  const hideConfirmModal = () => setConfirmModalVisibility(false);
  const showConfirmModal = () => setConfirmModalVisibility(true);

  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const {
    initializeSourceRestrictions,
    updatePrivateSourcesEnabled,
    updateRemoteEnabled,
    updateRemoteSource,
    updateStandardEnabled,
    updateStandardSource,
    saveSourceRestrictions,
    resetState,
  } = useActions(SecurityLogic);

  const { isEnabled, remote, standard, dataLoading, unsavedChanges } = useValues(SecurityLogic);

  useEffect(() => {
    initializeSourceRestrictions();
  }, []);

  const savePrivateSources = () => {
    saveSourceRestrictions();
    hideConfirmModal();
  };

  const headerActions = [
    <EuiButton
      disabled={!hasPlatinumLicense || !unsavedChanges || dataLoading}
      onClick={showConfirmModal}
      fill
      data-test-subj="SaveSettingsButton"
    >
      {SAVE_SETTINGS_BUTTON}
    </EuiButton>,
    <EuiButtonEmpty disabled={!unsavedChanges || dataLoading} onClick={resetState}>
      {RESET_BUTTON}
    </EuiButtonEmpty>,
  ];

  const allSourcesToggle = (
    <EuiPanel
      paddingSize="none"
      hasShadow={false}
      className={classNames({
        'euiPanel--disabled': !hasPlatinumLicense,
      })}
    >
      <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiSwitch
            checked={isEnabled}
            onChange={(e) => updatePrivateSourcesEnabled(e.target.checked)}
            disabled={!hasPlatinumLicense}
            showLabel={false}
            label="Private Sources Toggle"
            data-test-subj="PrivateSourcesToggle"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h2>{PRIVATE_SOURCES_TOGGLE_DESCRIPTION}</h2>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  const platinumLicenseCallout = (
    <>
      <EuiSpacer size="s" />
      <LicenseCallout message={PRIVATE_PLATINUM_LICENSE_CALLOUT} />
    </>
  );

  const sourceTables = (
    <>
      <EuiSpacer size="xl" />
      <PrivateSourcesTable
        sourceType="remote"
        sourceSection={remote}
        updateEnabled={updateRemoteEnabled}
        updateSource={updateRemoteSource}
      />
      <EuiSpacer size="xxl" />
      <PrivateSourcesTable
        sourceType="standard"
        sourceSection={standard}
        updateEnabled={updateStandardEnabled}
        updateSource={updateStandardSource}
      />
    </>
  );

  const confirmModal = (
    <EuiConfirmModal
      title={CONFIRM_CHANGES_TEXT}
      onConfirm={savePrivateSources}
      onCancel={hideConfirmModal}
      buttonColor="primary"
      cancelButtonText={KEEP_EDITING_BUTTON}
      confirmButtonText={SAVE_CHANGES_BUTTON}
    >
      {PRIVATE_SOURCES_UPDATE_CONFIRMATION_TEXT}
    </EuiConfirmModal>
  );

  return (
    <WorkplaceSearchPageTemplate
      pageChrome={[NAV.SECURITY]}
      pageHeader={{
        pageTitle: PRIVATE_SOURCES,
        description: PRIVATE_SOURCES_DESCRIPTION,
        rightSideItems: headerActions,
      }}
      isLoading={dataLoading}
    >
      <UnsavedChangesPrompt
        hasUnsavedChanges={unsavedChanges}
        messageText={SECURITY_UNSAVED_CHANGES_MESSAGE}
      />
      <EuiPanel hasShadow={false} hasBorder>
        {allSourcesToggle}
        {!hasPlatinumLicense && platinumLicenseCallout}
        {sourceTables}
      </EuiPanel>
      {confirmModalVisible && confirmModal}
    </WorkplaceSearchPageTemplate>
  );
};
