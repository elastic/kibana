/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useCallback } from 'react';
import { ITagsClient, Tag, TagAttributes } from '../../../common/types';
import { isServerValidationError } from '../../services/tags';
import { CreateOrEditModal } from './create_or_edit_modal';
import { validateTag } from './utils';
import { useValidation } from './use_validation';

interface EditTagModalProps {
  tag: Tag;
  onClose: () => void;
  onSave: (tag: Tag) => void;
  tagClient: ITagsClient;
}

const getAttributes = (tag: Tag): TagAttributes => {
  const { id, ...attributes } = tag;
  return attributes;
};

export const EditTagModal: FC<EditTagModalProps> = ({ tag, onSave, onClose, tagClient }) => {
  const [tagAttributes, setTagAttributes] = useState<TagAttributes>(getAttributes(tag));
  const { validation, setValidation, onNameChange, isValidating, hasDuplicateNameError } =
    useValidation({
      tagAttributes,
      tagClient,
    });

  const setField = useCallback(
    <T extends keyof TagAttributes>(field: T) =>
      (value: TagAttributes[T]) => {
        setTagAttributes((current) => ({
          ...current,
          [field]: value,
        }));
      },
    []
  );

  const onSubmit = useCallback(async () => {
    if (hasDuplicateNameError) {
      return;
    }

    const clientValidation = validateTag(tagAttributes);
    setValidation(clientValidation);

    if (!clientValidation.valid) {
      return;
    }

    try {
      const createdTag = await tagClient.update(tag.id, tagAttributes);
      onSave(createdTag);
    } catch (e) {
      // if e is IHttpFetchError, actual server error payload is in e.body
      if (isServerValidationError(e.body)) {
        setValidation(e.body.attributes);
      }
    }
  }, [tagAttributes, setValidation, tagClient, tag.id, onSave]);

  return (
    <CreateOrEditModal
      onClose={onClose}
      onSubmit={onSubmit}
      onNameChange={onNameChange}
      mode={'edit'}
      tag={tagAttributes}
      setField={setField}
      validation={validation}
      isValidating={isValidating}
    />
  );
};
