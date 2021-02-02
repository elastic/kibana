/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  EuiText,
  EuiSpacer,
  EuiPanel,
  EuiConfirmModal,
  EuiOverlayMask,
} from '@elastic/eui';

import { LicensingLogic } from '../../../shared/licensing';
import { FlashMessages } from '../../../shared/flash_messages';
import { LicenseCallout } from '../../components/shared/license_callout';
import { Loading } from '../../../shared/loading';
import { ViewContentHeader } from '../../components/shared/view_content_header';
import { SecurityLogic } from './security_logic';

import { PrivateSourcesTable } from './components/private_sources_table';

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
} from '../../constants';

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

  useEffect(() => {
    window.onbeforeunload = unsavedChanges ? () => SECURITY_UNSAVED_CHANGES_MESSAGE : null;
    return () => {
      window.onbeforeunload = null;
    };
  }, [unsavedChanges]);

  if (dataLoading) return <Loading />;

  const panelClass = classNames('euiPanel--noShadow', {
    'euiPanel--disabled': !hasPlatinumLicense,
  });

  const savePrivateSources = () => {
    saveSourceRestrictions();
    hideConfirmModal();
  };

  const headerActions = (
    <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty disabled={!unsavedChanges} onClick={resetState}>
          {RESET_BUTTON}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton
          disabled={!hasPlatinumLicense || !unsavedChanges}
          onClick={showConfirmModal}
          fill
          data-test-subj="SaveSettingsButton"
        >
          {SAVE_SETTINGS_BUTTON}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const header = (
    <>
      <ViewContentHeader
        title={PRIVATE_SOURCES}
        alignItems="flexStart"
        description={PRIVATE_SOURCES_DESCRIPTION}
        action={headerActions}
      />
      <EuiSpacer />
    </>
  );

  const allSourcesToggle = (
    <EuiPanel paddingSize="none" className={panelClass}>
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
          <EuiText size="s">
            <h4>{PRIVATE_SOURCES_TOGGLE_DESCRIPTION}</h4>
          </EuiText>
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
    <EuiOverlayMask>
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
    </EuiOverlayMask>
  );

  return (
    <>
      <FlashMessages />
      {header}
      {allSourcesToggle}
      {!hasPlatinumLicense && platinumLicenseCallout}
      {sourceTables}
      {confirmModalVisible && confirmModal}
    </>
  );
};
