/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinksStart, OverlayStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';

import React, { useCallback } from 'react';

// Direct imports are important here, importing all hooks breaks unit tests
// and increases bundle size because this is imported on first page load
import { useStartServices } from '../../../hooks/use_core';
import { ConfirmOpenUnverifiedModal } from '../components/confirm_open_unverified_modal';

const confirmOpenUnverified = ({
  pkgName,
  overlays,
  docLinks,
}: {
  pkgName: string;
  overlays: OverlayStart;
  docLinks: DocLinksStart;
}): Promise<boolean> =>
  new Promise((resolve) => {
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
        />
      )
    );
  });

export const useConfirmOpenUnverified = () => {
  const { overlays, docLinks } = useStartServices();

  return useCallback(
    (pkgName: string) => confirmOpenUnverified({ pkgName, overlays, docLinks }),
    [docLinks, overlays]
  );
};
