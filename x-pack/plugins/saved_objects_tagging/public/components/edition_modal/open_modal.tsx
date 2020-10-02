/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { OverlayStart } from 'src/core/public';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
import { Tag } from '../../../common/types';
import { ITagInternalClient } from '../../tags';
import { CreateTagModal } from './create_modal';
import { EditTagModal } from './edit_modal';

interface GetModalOpenerOptions {
  overlays: OverlayStart;
  tagClient: ITagInternalClient;
}

interface OpenCreateModalOptions {
  onCreate: (tag: Tag) => void;
}

export const getCreateModalOpener = ({ overlays, tagClient }: GetModalOpenerOptions) => ({
  onCreate,
}: OpenCreateModalOptions) => {
  const modal = overlays.openModal(
    toMountPoint(
      <CreateTagModal
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
};

interface OpenEditModalOptions {
  tagId: string;
  onUpdate: (tag: Tag) => void;
}

export const getEditModalOpener = ({ overlays, tagClient }: GetModalOpenerOptions) => async ({
  tagId,
  onUpdate,
}: OpenEditModalOptions) => {
  // TODO / try/catch + add onError handler
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
};
