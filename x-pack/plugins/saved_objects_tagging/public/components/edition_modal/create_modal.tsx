/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useState, useCallback } from 'react';
import { first, lastValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core/public';

import type { ITagsClient, Tag, TagAttributes } from '../../../common/types';
import { isServerValidationError } from '../../services/tags';
import { getRandomColor, validateTag } from './utils';
import { CreateOrEditModal } from './create_or_edit_modal';
import { useValidation } from './use_validation';

interface CreateTagModalProps {
  defaultValues?: Partial<TagAttributes>;
  onClose: () => void;
  onSave: (tag: Tag) => void;
  tagClient: ITagsClient;
  notifications: NotificationsStart;
}

const getDefaultAttributes = (providedDefaults?: Partial<TagAttributes>): TagAttributes => ({
  name: '',
  description: '',
  color: getRandomColor(),
  ...providedDefaults,
});

export const CreateTagModal: FC<CreateTagModalProps> = ({
  defaultValues,
  tagClient,
  notifications,
  onClose,
  onSave,
}) => {
  const [tagAttributes, setTagAttributes] = useState<TagAttributes>(
    getDefaultAttributes(defaultValues)
  );
  const { validation, setValidation, onNameChange, validation$, isValidating } = useValidation({
    tagAttributes,
    tagClient,
    validateDuplicateNameOnMount: true,
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
    const { hasDuplicateNameError } = await lastValueFrom(
      validation$.pipe(first((v) => v.isValidating === false))
    );

    if (hasDuplicateNameError) {
      return;
    }

    const clientValidation = validateTag(tagAttributes);
    setValidation(clientValidation);
    if (!clientValidation.valid) {
      return;
    }

    try {
      const createdTag = await tagClient.create(tagAttributes);
      onSave(createdTag);
    } catch (e) {
      // if e is IHttpFetchError, actual server error payload is in e.body
      if (isServerValidationError(e.body)) {
        setValidation(e.body.attributes);
      } else {
        notifications.toasts.addDanger({
          title: i18n.translate('xpack.savedObjectsTagging.saveTagErrorTitle', {
            defaultMessage: 'An error occurred creating tag',
          }),
          text: e.body.message,
        });
      }
    }
  }, [validation$, tagAttributes, setValidation, tagClient, onSave, notifications.toasts]);

  return (
    <CreateOrEditModal
      onClose={onClose}
      onSubmit={onSubmit}
      onNameChange={onNameChange}
      mode={'create'}
      tag={tagAttributes}
      setField={setField}
      validation={validation}
      isValidating={isValidating}
    />
  );
};
