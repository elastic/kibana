/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';

import type { ITagsClient, TagAttributes } from '../../../common/types';
import { type TagValidation, validateTagName } from '../../../common';
import { duplicateTagNameErrorMessage, managedTagConflictMessage, validateTag } from './utils';

const initialValidation: TagValidation = {
  valid: true,
  warnings: [],
  errors: {},
};

export const useValidation = ({
  tagAttributes,
  tagClient,
  validateDuplicateNameOnMount = false,
}: {
  tagAttributes: TagAttributes;
  tagClient: ITagsClient;
  validateDuplicateNameOnMount?: boolean;
}) => {
  const isMounted = useRef(false);
  const [validation, setValidation] = useState<TagValidation>(initialValidation);
  const {
    errors: { name: nameError },
  } = validation;

  const validation$ = useMemo(
    () =>
      new BehaviorSubject({
        isValidating: false,
        hasDuplicateNameError: false,
      }),
    []
  );

  const { isValidating = false } = useObservable(validation$) ?? {};

  const setIsValidating = useCallback(
    (value: boolean) => {
      validation$.next({
        ...validation$.value,
        isValidating: value,
      });
    },
    [validation$]
  );

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
            name: existingTag.managed ? managedTagConflictMessage : duplicateTagNameErrorMessage,
          },
        }));
      }

      setIsValidating(false);
    },
    [tagClient, setIsValidating]
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
    [setIsValidating, validateDuplicateTagName]
  );

  useEffect(() => {
    if (isMounted.current) {
      onNameChange(tagAttributes.name);
    }
  }, [onNameChange, tagAttributes.name]);

  useEffect(() => {
    if (isMounted.current) {
      setValidation(validateTag(tagAttributes));
    }
  }, [tagAttributes]);

  useEffect(() => {
    if (validateDuplicateNameOnMount && tagAttributes.name && !isMounted.current) {
      setIsValidating(true);
      validateDuplicateTagName(tagAttributes.name);
    }
    isMounted.current = true;
  }, [
    validateDuplicateNameOnMount,
    tagAttributes.name,
    validateDuplicateTagName,
    validation$,
    setIsValidating,
  ]);

  useEffect(() => {
    validation$.next({
      ...validation$.value,
      hasDuplicateNameError: [duplicateTagNameErrorMessage, managedTagConflictMessage].includes(
        nameError!
      ),
    });
  }, [nameError, validation$]);

  return {
    validation,
    setValidation,
    isValidating,
    validation$,
    onNameChange,
  };
};
