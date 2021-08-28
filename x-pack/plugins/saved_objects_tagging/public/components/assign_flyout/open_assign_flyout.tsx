/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDelayRender, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import type { NotificationsStart } from '../../../../../../src/core/public/notifications/notifications_service';
import type { OverlayStart } from '../../../../../../src/core/public/overlays/overlay_service';
import type { OverlayRef } from '../../../../../../src/core/public/overlays/types';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public/util/to_mount_point';
import type { ITagsCache } from '../../../../../../src/plugins/saved_objects_tagging_oss/public/api';
import type { ITagAssignmentService } from '../../services/assignments/assignment_service';

export interface GetAssignFlyoutOpenerOptions {
  overlays: OverlayStart;
  notifications: NotificationsStart;
  tagCache: ITagsCache;
  assignmentService: ITagAssignmentService;
  assignableTypes: string[];
}

export interface OpenAssignFlyoutOptions {
  /**
   * The list of tag ids to change assignments to.
   */
  tagIds: string[];
}

export type AssignFlyoutOpener = (options: OpenAssignFlyoutOptions) => Promise<OverlayRef>;

const LoadingIndicator = () => (
  <EuiDelayRender>
    <EuiLoadingSpinner />
  </EuiDelayRender>
);

const LazyAssignFlyout = React.lazy(() =>
  import('./assign_flyout').then(({ AssignFlyout }) => ({ default: AssignFlyout }))
);

export const getAssignFlyoutOpener = ({
  overlays,
  notifications,
  tagCache,
  assignmentService,
  assignableTypes,
}: GetAssignFlyoutOpenerOptions): AssignFlyoutOpener => async ({ tagIds }) => {
  const flyout = overlays.openFlyout(
    toMountPoint(
      <React.Suspense fallback={<LoadingIndicator />}>
        <LazyAssignFlyout
          tagIds={tagIds}
          tagCache={tagCache}
          notifications={notifications}
          allowedTypes={assignableTypes}
          assignmentService={assignmentService}
          onClose={() => flyout.close()}
        />
      </React.Suspense>
    ),
    { size: 'm', maxWidth: 600 }
  );

  return flyout;
};
