/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiPopover } from '@elastic/eui';
import { EuiSideNav } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import React, { useState } from 'react';
import { getOperationDefinition, OperationEditorProps, operations } from './operation_definitions';

export function OperationEditor(props: OperationEditorProps) {
  const { children, visModel, column, onColumnChange } = props;
  const [state, setState] = useState({
    isOpen: false,
  });
  const close = () => setState({ isOpen: false });
  const button = (
    <EuiLink onClick={() => setState({ ...state, isOpen: !state.isOpen })}>{children}</EuiLink>
  );
  const changeOperation = (operationType: string) => {
    const opDefinition = getOperationDefinition(operationType);
    onColumnChange(opDefinition.toSelectClause(column, visModel.datasource.fields));
  };

  const sideNavItems = [
    {
      name: '',
      id: '0',
      items: operations.map(op => ({
        name: op.name,
        id: op.type,
        isSelected: op.type === column.operation,
        onClick() {
          changeOperation(op.type);
        },
      })),
    },
  ];

  const SubEditor = getOperationDefinition(column.operation).editor;

  const subEditor = SubEditor ? (
    <EuiFlexItem>
      <SubEditor {...props} />
    </EuiFlexItem>
  ) : null;

  return (
    <EuiPopover
      id="contextMenu"
      button={button}
      isOpen={state.isOpen}
      closePopover={close}
      anchorPosition="leftCenter"
      withTitle
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={!subEditor}>
          <EuiSideNav items={sideNavItems} />
        </EuiFlexItem>
        {subEditor}
      </EuiFlexGroup>
    </EuiPopover>
  );
}
