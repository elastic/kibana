/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useCallback } from 'react';
import { ITagsClient, Tag, TagAttributes } from '../../../common/types';
import { TagValidation } from '../../../common/validation';
import { isServerValidationError } from '../../services/tags';
import { CreateOrEditModal } from './create_or_edit_modal';
import { validateTag } from './utils';

interface EditTagModalProps {
  tag: Tag;
  onClose: () => void;
  onSave: (tag: Tag) => void;
  tagClient: ITagsClient;
}

const initialValidation: TagValidation = {
  valid: true,
  warnings: [],
  errors: {},
};

const getAttributes = (tag: Tag): TagAttributes => {
  const { id, ...attributes } = tag;
  return attributes;
};

export const EditTagModal: FC<EditTagModalProps> = ({ tag, onSave, onClose, tagClient }) => {
  const [validation, setValidation] = useState<TagValidation>(initialValidation);
  const [tagAttributes, setTagAttributes] = useState<TagAttributes>(getAttributes(tag));

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
    const clientValidation = validateTag(tagAttributes);
    setValidation(clientValidation);
    if (!clientValidation.valid) {
      return;
    }

    try {
      const createdTag = await tagClient.update(tag.id, tagAttributes);
      onSave(createdTag);
    } catch (e) {
      // if e is HttpFetchError, actual server error payload is in e.body
      if (isServerValidationError(e.body)) {
        setValidation(e.body.attributes);
      }
    }
  }, [tagAttributes, tagClient, onSave, tag]);

  return (
    <CreateOrEditModal
      onClose={onClose}
      onSubmit={onSubmit}
      mode={'edit'}
      tag={tagAttributes}
      setField={setField}
      validation={validation}
    />
  );
};
