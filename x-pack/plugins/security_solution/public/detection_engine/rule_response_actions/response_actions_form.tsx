/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { isEmpty, map, some } from 'lodash';
import { ResponseActionsHeader } from './response_actions_header';
import { ResponseActionsList } from './response_actions_list';

import type { ArrayItem } from '../../shared_imports';
import { useSupportedResponseActionTypes } from './use_supported_response_action_types';

export interface ResponseActionValidatorRef {
  validation: {
    [key: string]: () => Promise<boolean>;
  };
}

interface IProps {
  items: ArrayItem[];
  addItem: () => void;
  removeItem: (id: number) => void;
  saveClickRef: React.RefObject<{
    onSaveClick?: () => void;
  }>;
}

export const ResponseActionsForm = ({ items, addItem, removeItem, saveClickRef }: IProps) => {
  const responseActionsValidationRef = useRef<ResponseActionValidatorRef>({ validation: {} });
  const supportedResponseActionTypes = useSupportedResponseActionTypes();

  useEffect(() => {
    if (saveClickRef && saveClickRef.current) {
      saveClickRef.current.onSaveClick = () => {
        return validateResponseActions();
      };
    }
  }, [saveClickRef]);

  const validateResponseActions = async () => {
    if (!isEmpty(responseActionsValidationRef.current?.validation)) {
      const response = await Promise.all(
        map(responseActionsValidationRef.current?.validation, async (validation) => {
          return validation();
        })
      );

      return some(response, (val) => !val);
    }
  };

  const form = useMemo(() => {
    if (!supportedResponseActionTypes?.length) {
      return null;
    }
    return (
      <ResponseActionsList
        items={items}
        removeItem={removeItem}
        supportedResponseActionTypes={supportedResponseActionTypes}
        addItem={addItem}
        formRef={responseActionsValidationRef}
      />
    );
  }, [addItem, responseActionsValidationRef, items, removeItem, supportedResponseActionTypes]);

  return (
    <>
      <EuiSpacer size="xxl" data-test-subj={'response-actions-form'} />
      <ResponseActionsHeader />
      {form}
    </>
  );
};
