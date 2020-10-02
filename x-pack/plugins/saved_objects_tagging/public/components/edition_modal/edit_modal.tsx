/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line no-restricted-imports
import omit from 'lodash/omit';
import React, { FC, useState, useCallback } from 'react';
import { ITagsClient, Tag, TagAttributes } from '../../../common/types';
import { CreateOrEditModal } from './create_or_edit_modal';
import { validateTag } from './utils';

interface EditTagModalProps {
  tag: Tag;
  onClose: () => void;
  onSave: (tag: Tag) => void;
  tagClient: ITagsClient;
}

export const EditTagModal: FC<EditTagModalProps> = ({ tag, onSave, onClose, tagClient }) => {
  const [tagAttributes, setTagAttributes] = useState<TagAttributes>(omit(tag, 'id'));

  const setField = useCallback(
    <T extends keyof TagAttributes>(field: T) => (value: TagAttributes[T]) => {
      setTagAttributes((current) => ({
        ...current,
        [field]: value,
      }));
    },
    []
  );

  const onSubmit = useCallback(async () => {
    try {
      const createdTag = await tagClient.update(tag.id, tagAttributes);
      onSave(createdTag);
      return { valid: true };
    } catch (e) {
      // TODO: display error from server.
      return { valid: false };
    }
  }, [tagAttributes, tagClient, onSave, tag]);

  return (
    <CreateOrEditModal
      onClose={onClose}
      onSubmit={onSubmit}
      mode={'edit'}
      tag={tagAttributes}
      setField={setField}
      validate={validateTag}
    />
  );
};
