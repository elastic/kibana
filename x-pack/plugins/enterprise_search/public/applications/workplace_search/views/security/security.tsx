/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import classNames from 'classnames';
import { useActions, useValues } from 'kea';

import { Prompt } from 'react-router-dom';

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

import { AppView, SidebarNavigation } from 'workplace_search/components';
import { FlashMessages } from '../../../shared/flash_messages';
import { LicenseCallout } from '../../components/shared/license_callout';
import { Loading } from '../../../shared/loading';
import { ViewContentHeader } from '../../components/shared/view_content_header';
import { SecurityLogic } from './security_logic';

import { PrivateSourcesTable } from './components/private_sources_table';

const UNSAVED_MESSAGE =
  'Your private sources settings have not been saved. Are you sure you want to leave?';

export const Security: React.FC = () => {
  const [confirmModalVisible, setConfirmModalVisibility] = useState(false);

  const hideConfirmModal = () => setConfirmModalVisibility(false);
  const showConfirmModal = () => setConfirmModalVisibility(true);

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

  const { isEnabled, isLocked, remote, standard, dataLoading, unsavedChanges } = useValues(
    SecurityLogic
  );

  useEffect(() => {
    initializeSourceRestrictions();
  }, []);

  useEffect(() => {
    window.onbeforeunload = unsavedChanges ? () => UNSAVED_MESSAGE : null;
    return () => {
      window.onbeforeunload = null;
    };
  }, [unsavedChanges]);

  if (dataLoading) return <Loading />;

  const panelClass = classNames('euiPanel--noShadow', { 'euiPanel--disabled': isLocked });

  const savePrivateSources = () => {
    saveSourceRestrictions();
    hideConfirmModal();
  };

  const headerActions = (
    <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty disabled={!unsavedChanges} onClick={resetState}>
          Reset
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton
          disabled={isLocked || !unsavedChanges}
          onClick={showConfirmModal}
          fill
          data-test-subj="SaveSettingsButton"
        >
          Save settings
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const sidebar = (
    <SidebarNavigation
      title="Security"
      description="Manage content source connection rules and information access for your organization."
    />
  );

  const header = (
    <>
      <ViewContentHeader
        title="Private sources"
        alignItems="flexStart"
        description="Private sources are connected by users in your organization to create a personalized search experience."
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
            disabled={isLocked}
            showLabel={false}
            label="Private Sources Toggle"
            data-test-subj="PrivateSourcesToggle"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <h4>Enable private sources for your organization</h4>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  const platinumLicenseCallout = (
    <>
      <EuiSpacer size="s" />
      <LicenseCallout message="Private sources require a Platinum license." />
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
        title="Confirm changes"
        onConfirm={savePrivateSources}
        onCancel={hideConfirmModal}
        buttonColor="primary"
        cancelButtonText="Keep editing"
        confirmButtonText="Save changes"
      >
        Updates to private source configuration will take effect immediately.
      </EuiConfirmModal>
    </EuiOverlayMask>
  );

  return (
    <AppView sidebar={sidebar}>
      <Prompt when={unsavedChanges} message={UNSAVED_MESSAGE} />
      <FlashMessages />
      {header}
      {allSourcesToggle}
      {isLocked && platinumLicenseCallout}
      {sourceTables}
      {confirmModalVisible && confirmModal}
    </AppView>
  );
};
