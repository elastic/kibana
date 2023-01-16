/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useMemo } from 'react';

import { ResponseActionsList } from './response_actions_list';
import type { ResponseActionType } from './get_supported_response_actions';
import { ResponseActionAddButton } from './response_action_add_button';
import type { ArrayItem } from '../../shared_imports';
import { useFormContext } from '../../shared_imports';

interface ResponseActionsWrapperProps {
  items: ArrayItem[];
  removeItem: (id: number) => void;
  addItem: () => void;
  supportedResponseActionTypes: ResponseActionType[];
}

export const ResponseActionsWrapper = React.memo<ResponseActionsWrapperProps>(
  ({ items, removeItem, supportedResponseActionTypes, addItem }) => {
    const actionTypeIdRef = useRef<string | null>(null);
    const updateActionTypeId = useCallback((id) => {
      actionTypeIdRef.current = id;
    }, []);

    const context = useFormContext();

    const renderButton = useMemo(() => {
      return (
        <ResponseActionAddButton
          supportedResponseActionTypes={supportedResponseActionTypes}
          addActionType={addItem}
          updateActionTypeId={updateActionTypeId}
        />
      );
    }, [addItem, updateActionTypeId, supportedResponseActionTypes]);

    useEffect(() => {
      if (actionTypeIdRef.current) {
        const index = items.length - 1;
        const path = `responseActions[${index}].actionTypeId`;
        context.setFieldValue(path, actionTypeIdRef.current);
        actionTypeIdRef.current = null;
      }
    }, [context, items.length]);

    return (
      <div data-test-subj="response-actions-wrapper">
        <ResponseActionsList items={items} removeItem={removeItem} />
        {renderButton}
      </div>
    );
  }
);

ResponseActionsWrapper.displayName = 'ResponseActionsWrapper';
