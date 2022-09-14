/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinksStart, OverlayStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';

import React, { useCallback } from 'react';

import { useStartServices } from '../../fleet/hooks';
import { ConfirmOpenUnverifiedModal } from '../components';

const confirmOpenUnverified = ({
  pkg,
  overlays,
  docLinks,
}: {
  pkg: { name: string; version: string };
  overlays: OverlayStart;
  docLinks: DocLinksStart;
}): Promise<boolean> =>
  new Promise((resolve) => {
    const session = overlays.openModal(
      toMountPoint(
        <ConfirmOpenUnverifiedModal
          pkg={pkg}
          onConfirm={() => {
            session.close();
            resolve(true);
          }}
          onCancel={() => {
            session.close();
            resolve(false);
          }}
          docLinks={docLinks}
        />
      )
    );
  });

export const useConfirmOpenUnverified = () => {
  const { overlays, docLinks } = useStartServices();

  return useCallback(
    (pkg: { name: string; version: string }) => confirmOpenUnverified({ pkg, overlays, docLinks }),
    [docLinks, overlays]
  );
};
