/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line no-restricted-imports
import omit from 'lodash/omit';
import React, { FC, useState, useCallback, useEffect } from 'react';
import { ITagsClient, Tag, TagAttributes } from '../../../common/types';
import { TagValidation } from '../../../common/validation';
import { isServerValidationError } from '../../tags';
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

export const EditTagModal: FC<EditTagModalProps> = ({ tag, onSave, onClose, tagClient }) => {
  const [pristine, setPristine] = useState<boolean>(true);
  const [validation, setValidation] = useState<TagValidation>(initialValidation);
  const [tagAttributes, setTagAttributes] = useState<TagAttributes>(omit(tag, 'id'));

  const setField = useCallback(
    <T extends keyof TagAttributes>(field: T) => (value: TagAttributes[T]) => {
      setTagAttributes((current) => ({
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
