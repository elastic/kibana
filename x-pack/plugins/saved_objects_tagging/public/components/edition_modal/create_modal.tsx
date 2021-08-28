/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useCallback, useState } from 'react';
import type {
  ITagsClient,
  Tag,
  TagAttributes,
} from '../../../../../../src/plugins/saved_objects_tagging_oss/common/types';
import type { TagValidation } from '../../../common/validation';
import { isServerValidationError } from '../../services/tags/errors';
import { CreateOrEditModal } from './create_or_edit_modal';
import { getRandomColor, validateTag } from './utils';

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
