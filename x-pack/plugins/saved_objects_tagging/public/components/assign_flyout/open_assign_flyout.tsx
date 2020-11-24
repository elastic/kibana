/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { OverlayStart, OverlayRef } from 'src/core/public';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
import { taggableTypes } from '../../../common/constants';
import { ITagInternalClient, ITagAssignmentService } from '../../services';

export interface GetAssignFlyoutOpenerOptions {
  overlays: OverlayStart;
  tagClient: ITagInternalClient;
  assignmentService: ITagAssignmentService;
}

export interface OpenAssignFlyoutOptions {
  tagIds: string[];
}

export type AssignFlyoutOpener = (options: OpenAssignFlyoutOptions) => Promise<OverlayRef>;

export const getAssignFlyoutOpener = ({
  overlays,
  tagClient,
  assignmentService,
}: GetAssignFlyoutOpenerOptions): AssignFlyoutOpener => async ({ tagIds }) => {
  const { AssignFlyout } = await import('./assign_flyout');
  const flyout = overlays.openFlyout(
    toMountPoint(
      <AssignFlyout
        tagIds={tagIds}
        allowedTypes={taggableTypes}
        tagClient={tagClient}
        assignmentService={assignmentService}
        onClose={() => flyout.close()}
      />
    ),
    { size: 'm', maxWidth: 560 }
  );

  return flyout;
};
