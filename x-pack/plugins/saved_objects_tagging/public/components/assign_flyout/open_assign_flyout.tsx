/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { OverlayStart, OverlayRef } from 'src/core/public';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
import { taggableTypes } from '../../../common/constants';
import { ITagAssignmentService, ITagsCache } from '../../services';

export interface GetAssignFlyoutOpenerOptions {
  overlays: OverlayStart;
  tagCache: ITagsCache;
  assignmentService: ITagAssignmentService;
}

export interface OpenAssignFlyoutOptions {
  tagIds: string[];
}

export type AssignFlyoutOpener = (options: OpenAssignFlyoutOptions) => Promise<OverlayRef>;

export const getAssignFlyoutOpener = ({
  overlays,
  tagCache,
  assignmentService,
}: GetAssignFlyoutOpenerOptions): AssignFlyoutOpener => async ({ tagIds }) => {
  const { AssignFlyout } = await import('./assign_flyout');
  const flyout = overlays.openFlyout(
    toMountPoint(
      <AssignFlyout
        tagIds={tagIds}
        tagCache={tagCache}
        allowedTypes={taggableTypes}
        assignmentService={assignmentService}
        onClose={() => flyout.close()}
      />
    ),
    { size: 'm', maxWidth: 600 }
  );

  return flyout;
};
