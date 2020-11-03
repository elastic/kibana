/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useCallback } from 'react';
import { ITagsClient, Tag, TagAttributes } from '../../../common/types';
import { TagValidation } from '../../../common/validation';
import { isServerValidationError } from '../../tags';
import { getRandomColor, validateTag } from './utils';
import { CreateOrEditModal } from './create_or_edit_modal';

interface CreateTagModalProps {
  defaultValues?: Partial<TagAttributes>;
  onClose: () => void;
  onSave: (tag: Tag) => void;
  tagClient: ITagsClient;
}

const getDefaultAttributes = (providedDefaults?: Partial<TagAttributes>): TagAttributes => ({
  name: '',
  description: '',
  color: getRandomColor(),
  ...providedDefaults,
});

const initialValidation: TagValidation = {
  valid: true,
  warnings: [],
  errors: {},
};

export const CreateTagModal: FC<CreateTagModalProps> = ({
  defaultValues,
  tagClient,
  onClose,
  onSave,
}) => {
  const [validation, setValidation] = useState<TagValidation>(initialValidation);
  const [tagAttributes, setTagAttributes] = useState<TagAttributes>(
    getDefaultAttributes(defaultValues)
  );

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
      const createdTag = await tagClient.create(tagAttributes);
      onSave(createdTag);
    } catch (e) {
      // if e is HttpFetchError, actual server error payload is in e.body
      if (isServerValidationError(e.body)) {
        setValidation(e.body.attributes);
      }
    }
  }, [tagAttributes, tagClient, onSave]);

  return (
    <CreateOrEditModal
      onClose={onClose}
      onSubmit={onSubmit}
      mode={'create'}
      tag={tagAttributes}
      setField={setField}
      validation={validation}
    />
  );
};
