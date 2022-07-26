/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverlayStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';

import React from 'react';

import { useStartServices } from '../../fleet/hooks';
import { ConfirmForceInstallModal } from '../components';

const confirmForceInstall = ({
  pkg,
  overlays,
}: {
  pkg: { name: string; version: string };
  overlays: OverlayStart;
}): Promise<boolean> =>
  new Promise((resolve) => {
    const session = overlays.openModal(
      toMountPoint(
        <ConfirmForceInstallModal
          pkg={pkg}
          onConfirm={() => {
            session.close();
            resolve(true);
          }}
          onCancel={() => {
            session.close();
            resolve(false);
          }}
        />
      )
    );
  });

export const useConfirmForceInstall = () => {
  const { overlays } = useStartServices();

  return (pkg: { name: string; version: string }) => confirmForceInstall({ pkg, overlays });
};
