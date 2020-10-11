/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useCallback, useEffect } from 'react';
import { ITagsClient, Tag, TagAttributes } from '../../../common/types';
import { TagValidation } from '../../../common/validation';
import { isServerValidationError } from '../../tags';
import { getRandomColor, validateTag } from './utils';
import { CreateOrEditModal } from './create_or_edit_modal';

interface CreateTagModalProps {
  onClose: () => void;
  onSave: (tag: Tag) => void;
  tagClient: ITagsClient;
}

const createEmptyTag = (): TagAttributes => ({
  name: '',
  description: '',
  color: getRandomColor(),
});

const initialValidation: TagValidation = {
  valid: true,
  warnings: [],
  errors: {},
};

export const CreateTagModal: FC<CreateTagModalProps> = ({ tagClient, onClose, onSave }) => {
  const [pristine, setPristine] = useState<boolean>(true);
  const [validation, setValidation] = useState<TagValidation>(initialValidation);
  const [tag, setTag] = useState<TagAttributes>(createEmptyTag());

  const setField = useCallback(
    <T extends keyof TagAttributes>(field: T) => (value: TagAttributes[T]) => {
      setTag((current) => ({
        ...current,
        [field]: value,
      }));
      setPristine(false);
    },
    []
  );

  useEffect(() => {
    const newValidation = validateTag(tag);
    // we don't want to display error if the form has not been touched.
    if (pristine) {
      newValidation.errors = {};
    }
    setValidation(newValidation);
  }, [tag, pristine]);

  const onSubmit = useCallback(async () => {
    try {
      const createdTag = await tagClient.create(tag);
      onSave(createdTag);
    } catch (e) {
      // if e is HttpFetchError, actual server error payload is in e.body
      if (isServerValidationError(e.body)) {
        setValidation(e.body.attributes);
      }
    }
  }, [tag, tagClient, onSave]);

  return (
    <CreateOrEditModal
      onClose={onClose}
      onSubmit={onSubmit}
      mode={'create'}
      tag={tag}
      setField={setField}
      validation={validation}
    />
  );
};
