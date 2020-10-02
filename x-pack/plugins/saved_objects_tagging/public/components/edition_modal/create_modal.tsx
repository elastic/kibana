/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useCallback } from 'react';
import { ITagsClient, Tag, TagAttributes } from '../../../common/types';
import { getRandomColor } from './utils';
import { CreateOrEditModal } from './create_or_edit_modal';
import { validateTag } from './utils';

interface CreateTagModalProps {
  onClose: () => void;
  onSave: (tag: Tag) => void;
  tagClient: ITagsClient;
}

const createEmptyTag = (): TagAttributes => ({
  title: '',
  description: '',
  color: getRandomColor(),
});

export const CreateTagModal: FC<CreateTagModalProps> = ({ tagClient, onClose, onSave }) => {
  const [tag, setTag] = useState<TagAttributes>(createEmptyTag());

  const setField = useCallback(
    <T extends keyof TagAttributes>(field: T) => (value: TagAttributes[T]) => {
      setTag((current) => ({
        ...current,
        [field]: value,
      }));
    },
    []
  );

  const onSubmit = useCallback(async () => {
    try {
      const createdTag = await tagClient.create(tag);
      onSave(createdTag);
      return { valid: true };
    } catch (e) {
      // TODO: display error from server.
      return { valid: false };
    }
  }, [tag, tagClient, onSave]);

  return (
    <CreateOrEditModal
      onClose={onClose}
      onSubmit={onSubmit}
      mode={'create'}
      tag={tag}
      setField={setField}
      validate={validateTag}
    />
  );
};
