/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonToggle, EuiLink, EuiPopover } from '@elastic/eui';
import { EuiSideNav } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import React, { useState } from 'react';
import { DatasourceField, fieldToOperation, SelectOperation } from '../../../../common';
import { isApplicableForCardinality, isApplicableForScale } from '../../lib';
import { Draggable } from '../draggable';
import { getOperationDefinition, OperationEditorProps, operations } from './operation_definitions';

export function OperationEditor(props: OperationEditorProps) {
  const {
    children,
    visModel,
    column,
    onColumnChange,
    removable,
    onColumnRemove,
    allowedScale,
    allowedCardinality,
    defaultOperator,
    canDrop,
  } = props;
  const [state, setState] = useState({
    isOpen: false,
  });
  const onDropField = (field: DatasourceField) => {
    const updatedColumn =
      'argument' in column &&
      column.argument.field &&
      getOperationDefinition(column.operator).applicableFields([field], props).length === 1
        ? ({ ...column, argument: { ...column.argument, field: field.name } } as SelectOperation)
        : fieldToOperation(field, defaultOperator(field));

    // keep alias to avoid updating references
    updatedColumn.alias = column.alias;

    onColumnChange(updatedColumn);
  };
  const close = () => setState({ isOpen: false });

  const button = (
    <Draggable
      canHandleDrop={(f: DatasourceField) => (canDrop ? canDrop(f) : true)}
      onDrop={onDropField}
    >
      <EuiLink onClick={() => setState({ ...state, isOpen: !state.isOpen })}>{children}</EuiLink>
    </Draggable>
  );
  const changeOperation = (operationType: string) => {
    const opDefinition = getOperationDefinition(operationType);
    onColumnChange(opDefinition.toSelectClause(column, visModel.datasource!.fields));
  };

  const sideNavItems = [
    {
      name: '',
      id: '0',
      items: operations
        .filter(
          ({ operator }) =>
            isApplicableForScale(operator, allowedScale) &&
            isApplicableForCardinality(operator, allowedCardinality)
        )
        .map(op => ({
          name: op.name,
          id: op.operator,
          isSelected: op.operator === column.operator,
          onClick() {
            changeOperation(op.operator);
          },
        })),
    },
  ];

  const SubEditor = getOperationDefinition(column.operator).editor;

  const subEditor = SubEditor ? (
    <EuiFlexItem>
      <SubEditor {...props} />
    </EuiFlexItem>
  ) : null;

  return (
    <>
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
      {removable && (
        <EuiButtonToggle
          iconType="cross"
          label="Remove"
          isIconOnly
          isEmpty
          onChange={onColumnRemove}
        />
      )}
    </>
  );
}
