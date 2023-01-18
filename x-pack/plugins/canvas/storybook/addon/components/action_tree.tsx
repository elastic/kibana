/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { isObject, isDate } from 'lodash';
import { v4 as uuid } from 'uuid';
import { EuiTreeView } from '@elastic/eui';

import { Node } from '@elastic/eui/src/components/tree_view/tree_view';

import { RecordedAction } from '../types';

const actionToTree = (recordedAction: RecordedAction) => {
  const { action, newState, previousState } = recordedAction;

  return [
    {
      label: 'Action',
      id: uuid(),
      children: jsonToTree(action),
    },
    {
      label: 'Previous State',
      id: uuid(),
      children: jsonToTree(previousState),
    },
    {
      label: 'Current State',
      id: uuid(),
      children: jsonToTree(newState),
    },
  ];
};

const jsonToTree: (obj: Record<string, any>) => Node[] = (obj) => {
  const keys = Object.keys(obj);

  const values = keys.map((label) => {
    const value = obj[label];

    if (!value) {
      return null;
    }

    const id = uuid();

    if (isDate(value)) {
      return { label: `${label}: ${(value as Date).toDateString()}` };
    }

    if (isObject(value)) {
      const children = jsonToTree(value);

      if (children !== null && Object.keys(children).length > 0) {
        return { label, id, children };
      } else {
        return { label, id };
      }
    }

    return { label: `${label}: ${value.toString().slice(0, 100)}`, id };
  });

  return values.filter((value) => value !== null) as Node[];
};

export const ActionTree: FC<{ action: RecordedAction | null }> = ({ action }) => {
  const items = action ? actionToTree(action) : null;
  let tree = <></>;

  if (action && items) {
    tree = (
      <EuiTreeView
        className="panel__tree"
        display="compressed"
        items={items}
        showExpansionArrows={true}
        aria-label="Result"
      />
    );
  } else if (action) {
    tree = <div>No change</div>;
  }

  return tree;
};
