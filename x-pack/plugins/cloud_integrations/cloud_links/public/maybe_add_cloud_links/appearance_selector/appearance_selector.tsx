/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import { UserProfilesKibanaProvider } from '@kbn/user-profile-components';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';

import { AppearanceModal } from './appearance_modal';

interface Props {
  security: SecurityPluginStart;
  core: CoreStart;
  closePopover: () => void;
}

export const AppearanceSelector = ({ security, core, closePopover }: Props) => {
  return (
    <UserProfilesKibanaProvider core={core} security={security} toMountPoint={toMountPoint}>
      <AppearanceSelectorUI core={core} closePopover={closePopover} />
    </UserProfilesKibanaProvider>
  );
};

function AppearanceSelectorUI({
  core,
  closePopover,
}: {
  core: CoreStart;
  closePopover: () => void;
}) {
  const modalRef = useRef<OverlayRef | null>(null);

  const closeModal = () => {
    modalRef.current?.close();
    modalRef.current = null;
  };

  const openModal = () => {
    modalRef.current = core.overlays.openModal(
      toMountPoint(
        <AppearanceModal closeModal={closeModal} uiSettingsClient={core.uiSettings} />,
        core
      ),
      { 'data-test-subj': 'appearanceModal', maxWidth: 600 }
    );
  };

  return (
    <>
      <EuiContextMenuItem
        icon="brush"
        size="s"
        onClick={() => {
          openModal();
          closePopover();
        }}
        data-test-subj="appearanceSelector"
      >
        {i18n.translate('xpack.cloudLinks.userMenuLinks.appearanceLinkText', {
          defaultMessage: 'Appearance',
        })}
      </EuiContextMenuItem>
    </>
  );
}
