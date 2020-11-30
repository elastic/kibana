/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { OverlayStart, OverlayRef } from 'src/core/public';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
import { Tag, TagAttributes } from '../../../common/types';
import { ITagInternalClient } from '../../tags';

interface GetModalOpenerOptions {
  overlays: OverlayStart;
  tagClient: ITagInternalClient;
}

interface OpenCreateModalOptions {
  defaultValues?: Partial<TagAttributes>;
  onCreate: (tag: Tag) => void;
}

export type CreateModalOpener = (options: OpenCreateModalOptions) => Promise<OverlayRef>;

export const getCreateModalOpener = ({
  overlays,
  tagClient,
}: GetModalOpenerOptions): CreateModalOpener => async ({
  onCreate,
  defaultValues,
}: OpenCreateModalOptions) => {
  const { CreateTagModal } = await import('./create_modal');
  const modal = overlays.openModal(
    toMountPoint(
      <CreateTagModal
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
    )
  );
  return modal;
};

interface OpenEditModalOptions {
  tagId: string;
  onUpdate: (tag: Tag) => void;
}

export const getEditModalOpener = ({ overlays, tagClient }: GetModalOpenerOptions) => async ({
  tagId,
  onUpdate,
}: OpenEditModalOptions) => {
  const { EditTagModal } = await import('./edit_modal');
  const tag = await tagClient.get(tagId);

  const modal = overlays.openModal(
    toMountPoint(
      <EditTagModal
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
    )
  );

  return modal;
};
