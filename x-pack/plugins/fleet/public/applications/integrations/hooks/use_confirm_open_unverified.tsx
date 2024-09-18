/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toMountPoint } from '@kbn/react-kibana-mount';

import React, { useCallback } from 'react';

// Direct imports are important here, importing all hooks breaks unit tests
// and increases bundle size because this is imported on first page load
import type { FleetStartServices } from '../../../plugin';

import { useStartServices } from '../../../hooks/use_core';
import { ConfirmOpenUnverifiedModal } from '../components/confirm_open_unverified_modal';

type StartServicesConfirmOpen = Pick<
  FleetStartServices,
  'docLinks' | 'overlays' | 'analytics' | 'i18n' | 'theme'
>;

const confirmOpenUnverified = ({
  pkgName,
  fleetServices,
}: {
  pkgName: string;
  fleetServices: StartServicesConfirmOpen;
}): Promise<boolean> =>
  new Promise((resolve) => {
    const { overlays, docLinks, ...startServices } = fleetServices;
    const session = overlays.openModal(
      toMountPoint(
        <ConfirmOpenUnverifiedModal
          pkgName={pkgName}
          onConfirm={() => {
            session.close();
            resolve(true);
          }}
          onCancel={() => {
            session.close();
            resolve(false);
          }}
          docLinks={docLinks}
        />,
        startServices
      )
    );
  });

export const useConfirmOpenUnverified = () => {
  const fleetServices = useStartServices();

  return useCallback(
    (pkgName: string) => confirmOpenUnverified({ pkgName, fleetServices }),
    [fleetServices]
  );
};
