/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ResponseActionTypeForm } from './response_action_type_form';
import type { ArrayItem } from '../../../shared_imports';

interface IResponseActionsListProps {
  items: ArrayItem[];
  removeItem: (id: number) => void;
}

// eslint-disable-next-line react/display-name
export const ResponseActionsList = React.memo(
  ({ items, removeItem }: IResponseActionsListProps) => {
    return (
      <>
        {items.map((actionItem) => {
          return (
            <div key={actionItem.id}>
              <ResponseActionTypeForm item={actionItem} onDeleteAction={removeItem} />
            </div>
          );
        })}
      </>
    );
  }
);
