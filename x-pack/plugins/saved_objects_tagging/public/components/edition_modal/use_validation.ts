/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { type TagValidation, validateTagName } from '../../../common';
import type { ITagsClient, TagAttributes } from '../../../common/types';
import { duplicateTagNameErrorMessage, validateTag } from './utils';

const initialValidation: TagValidation = {
  valid: true,
  warnings: [],
  errors: {},
};

export const useValidation = ({
  tagAttributes,
  tagClient,
}: {
  tagAttributes: TagAttributes;
  tagClient: ITagsClient;
}) => {
  const [validation, setValidation] = useState<TagValidation>(initialValidation);
  const [isValidating, setIsValidating] = useState(false);
  const hasDuplicateNameError = validation.errors.name === duplicateTagNameErrorMessage;

  const validateDuplicateTagName = useCallback(
    async (name: string) => {
      const error = validateTagName(name);
      if (error) {
        return;
      }

      const existingTag = await tagClient.findByName(name, { exact: true });

      if (existingTag) {
        setValidation((prev) => ({
          ...prev,
          valid: false,
          errors: {
            ...prev.errors,
            name: duplicateTagNameErrorMessage,
          },
        }));
      } else {
        setValidation(validateTag(tagAttributes));
      }
    },
    [tagAttributes, tagClient]
  );

  const onNameChange = useCallback(
    async (
      name: string,
      {
        debounced = false,
        hasBeenModified = true,
      }: { debounced?: boolean; hasBeenModified?: boolean } = {}
    ) => {
      setIsValidating(true);

      if (debounced) {
        if (hasBeenModified) {
          await validateDuplicateTagName(name);
        }
        setIsValidating(false);
      }
    },
    [validateDuplicateTagName]
  );

  useEffect(() => {
    onNameChange(tagAttributes.name);
  }, [onNameChange, tagAttributes.name]);

  return {
    validation,
    setValidation,
    isValidating,
    onNameChange,
    hasDuplicateNameError,
  };
};
