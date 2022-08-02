/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDelayRender, EuiLoadingSpinner } from '@elastic/eui';
import { NotificationsStart, OverlayStart, ThemeServiceStart, OverlayRef } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { ITagAssignmentService, ITagsCache } from '../../services';

export interface GetAssignFlyoutOpenerOptions {
  overlays: OverlayStart;
  notifications: NotificationsStart;
  theme: ThemeServiceStart;
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

export const getAssignFlyoutOpener =
  ({
    overlays,
    notifications,
    theme,
    tagCache,
    assignmentService,
    assignableTypes,
  }: GetAssignFlyoutOpenerOptions): AssignFlyoutOpener =>
  async ({ tagIds }) => {
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
        </React.Suspense>,
        { theme$: theme.theme$ }
      ),
      { size: 'm', maxWidth: 600 }
    );

    return flyout;
  };
