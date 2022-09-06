/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import type { ResponseActionType } from './get_supported_response_actions';
import { ResponseActionAddButton } from './response_action_add_button';
import { ResponseActionTypeForm } from './response_action_type_form';
import type { ArrayItem } from '../../../shared_imports';
import { UseField, useFormContext } from '../../../shared_imports';

interface IResponseActionsListProps {
  items: ArrayItem[];
  removeItem: (id: number) => void;
  addItem: () => void;
  supportedResponseActionTypes: ResponseActionType[];
  formRef: React.RefObject<{ validation: () => Promise<{ isValid: boolean }> }>;
}

const GhostFormField = () => <></>;

// eslint-disable-next-line react/display-name
export const ResponseActionsList = React.memo(
  ({
    items,
    removeItem,
    supportedResponseActionTypes,
    addItem,
    formRef,
  }: IResponseActionsListProps) => {
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
      <>
        {items.map((actionItem, index) => {
          return (
            <div key={actionItem.id}>
              <ResponseActionTypeForm
                item={actionItem}
                onDeleteAction={removeItem}
                formRef={formRef}
              />

              <UseField path={`${actionItem.path}.actionTypeId`} component={GhostFormField} />
            </div>
          );
        })}

        {renderButton}
      </>
    );
  }
);
