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
import { ResponseActionAddButton } from './response_action_add_button';
import { useSupportedResponseActionTypes } from './use_supported_response_action_types';
import { UseField } from '../../../shared_imports';

const GhostFormField = () => <></>;

interface IProps {
  items: ArrayItem[];
  addItem: () => void;
  removeItem: (id: number) => void;
}

export const ResponseActionsForm = ({ items, addItem, removeItem }: IProps) => {
  const form = useMemo(() => {
    return <ResponseActionsList items={items} removeItem={removeItem} />;
  }, [items, removeItem]);
  const supportedResponseActionTypes = useSupportedResponseActionTypes();
  if (!supportedResponseActionTypes?.length)
    return <UseField path="responseActions" component={GhostFormField} />;

  return (
    <>
      <ResponseActionsHeader />
      {form}
      <ResponseActionAddButton
        supportedResponseActionTypes={supportedResponseActionTypes}
        addActionType={addItem}
      />
    </>
  );
};
