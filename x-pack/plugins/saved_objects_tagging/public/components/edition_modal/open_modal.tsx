/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDelayRender, EuiLoadingSpinner } from '@elastic/eui';
import { OverlayStart, OverlayRef, ThemeServiceStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { Tag, TagAttributes } from '../../../common/types';
import { ITagInternalClient } from '../../services';

interface GetModalOpenerOptions {
  overlays: OverlayStart;
  theme: ThemeServiceStart;
  tagClient: ITagInternalClient;
}

interface OpenCreateModalOptions {
  defaultValues?: Partial<TagAttributes>;
  onCreate: (tag: Tag) => void;
}

const LoadingIndicator = () => (
  <EuiDelayRender>
    <EuiLoadingSpinner />
  </EuiDelayRender>
);

export type CreateModalOpener = (options: OpenCreateModalOptions) => Promise<OverlayRef>;

const LazyCreateTagModal = React.lazy(() =>
  import('./create_modal').then(({ CreateTagModal }) => ({ default: CreateTagModal }))
);

const LazyEditTagModal = React.lazy(() =>
  import('./edit_modal').then(({ EditTagModal }) => ({ default: EditTagModal }))
);

export const getCreateModalOpener =
  ({ overlays, theme, tagClient }: GetModalOpenerOptions): CreateModalOpener =>
  async ({ onCreate, defaultValues }: OpenCreateModalOptions) => {
    const modal = overlays.openModal(
      toMountPoint(
        <React.Suspense fallback={<LoadingIndicator />}>
          <LazyCreateTagModal
            defaultValues={defaultValues}
            onClose={() => {
              modal.close();
            }}
            onSave={(tag) => {
              modal.close();
              onCreate(tag);
            }}
            tagClient={tagClient}
          />
        </React.Suspense>,
        { theme$: theme.theme$ }
      )
    );
    return modal;
  };

interface OpenEditModalOptions {
  tagId: string;
  onUpdate: (tag: Tag) => void;
}

export const getEditModalOpener =
  ({ overlays, theme, tagClient }: GetModalOpenerOptions) =>
  async ({ tagId, onUpdate }: OpenEditModalOptions) => {
    const tag = await tagClient.get(tagId);

    const modal = overlays.openModal(
      toMountPoint(
        <React.Suspense fallback={<LoadingIndicator />}>
          <LazyEditTagModal
            tag={tag}
            onClose={() => {
              modal.close();
            }}
            onSave={(saved) => {
              modal.close();
              onUpdate(saved);
            }}
            tagClient={tagClient}
          />
        </React.Suspense>,
        { theme$: theme.theme$ }
      )
    );

    return modal;
  };
