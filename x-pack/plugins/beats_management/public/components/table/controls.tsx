/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { AutocompleteField } from '../autocomplete_field/index';
import { OptionControl } from '../table_controls';
import { AssignmentOptions as AssignmentOptionsType, KueryBarProps } from './table';

interface ControlBarProps {
  assignmentOptions: AssignmentOptionsType;
  kueryBarProps?: KueryBarProps;
  selectionCount: number;
}

export function ControlBar(props: ControlBarProps) {
  const {
    assignmentOptions: { actionHandler, items, schema, type },
    kueryBarProps,
    selectionCount,
  } = props;

  if (type === 'none') {
    return null;
  }

  const showSearch = type !== 'assignment' || selectionCount === 0;
  const showAssignmentOptions = type === 'assignment' && selectionCount > 0;
  const showPrimaryOptions = type === 'primary' && selectionCount > 0;

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
      {showPrimaryOptions &&
        schema.map(def => (
          <EuiFlexItem key={def.name} grow={def.grow}>
            <OptionControl
              schema={def}
              selectionCount={selectionCount}
              actionHandler={actionHandler}
              items={items}
            />
          </EuiFlexItem>
        ))}
      {showSearch &&
        kueryBarProps && (
          <EuiFlexItem>
            <AutocompleteField {...kueryBarProps} placeholder="Filter results" />
          </EuiFlexItem>
        )}
      {showAssignmentOptions &&
        schema.map(def => (
          <EuiFlexItem key={def.name} grow={def.grow}>
            <OptionControl
              schema={def}
              selectionCount={selectionCount}
              actionHandler={actionHandler}
              items={items}
            />
          </EuiFlexItem>
        ))}
    </EuiFlexGroup>
  );
}
