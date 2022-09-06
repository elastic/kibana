/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { ResponseActionsHeader } from './response_actions_header';
import { ResponseActionsList } from './response_actions_list';

import type { ArrayItem } from '../../../shared_imports';
import { useSupportedResponseActionTypes } from './use_supported_response_action_types';
import { UseField } from '../../../shared_imports';

const GhostFormField = () => <></>;
export interface ResponseActionValidatorRef {
  validation?: (actions: unknown) => Promise<{ [key: number]: { isValid: boolean } }>;
  actions?: unknown;
}
interface IProps {
  items: ArrayItem[];
  addItem: () => void;
  removeItem: (id: number) => void;
  formRef: React.RefObject<ResponseActionValidatorRef>;
}

export const ResponseActionsForm = ({ items, addItem, removeItem, formRef }: IProps) => {
  const supportedResponseActionTypes = useSupportedResponseActionTypes();

  const form = useMemo(() => {
    if (!supportedResponseActionTypes?.length) {
      return <UseField path="responseActions" component={GhostFormField} />;
    }
    return (
      <ResponseActionsList
        items={items}
        removeItem={removeItem}
        supportedResponseActionTypes={supportedResponseActionTypes}
        addItem={addItem}
        formRef={formRef}
      />
    );
  }, [addItem, formRef, items, removeItem, supportedResponseActionTypes]);

  return (
    <>
      <ResponseActionsHeader />
      {form}
    </>
  );
};
