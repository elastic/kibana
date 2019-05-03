/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiLink, EuiPopover } from '@elastic/eui';
import { EuiSideNav } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import React, { useState } from 'react';
import {
  DatasourceField,
  FieldOperation,
  fieldToOperation,
  SelectOperation,
  SelectOperator,
} from '../../../../common';
import { isApplicableForCardinality, isApplicableForScale } from '../../lib';
import { Draggable } from '../draggable';
import { getOperationDefinition, OperationEditorProps, operations } from './operation_definitions';

function isFieldOperation(
  operation: SelectOperation
): operation is SelectOperation & FieldOperation {
  return Boolean('argument' in operation && operation.argument.field);
}

export function OperationEditor<T extends SelectOperation>(props: OperationEditorProps<T>) {
  const {
    children,
    visModel,
    operation,
    onOperationChange,
    removable,
    onOperationRemove,
    allowedScale,
    allowedCardinality,
    defaultOperator,
    canDrop,
  } = props;
  const [state, setState] = useState({
    isOpen: false,
  });
  const onDropField = (field: DatasourceField) => {
    const updatedOperation =
      isFieldOperation(operation) &&
      getOperationDefinition(operation.operator).applicableFields([field], props).length === 1
        ? {
            ...operation,
            argument: { ...operation.argument, field: field.name },
          }
        : { ...fieldToOperation(field, defaultOperator(field)), id: operation.id };

    // keep alias to avoid updating references
    updatedOperation.id = operation.id;

    onOperationChange(updatedOperation);
  };
  const close = () => setState({ isOpen: false });

  const button = (
    <Draggable
      canHandleDrop={(f: DatasourceField) => (canDrop ? canDrop(f) : true)}
      onDrop={onDropField}
    >
      <EuiLink className="lnsConfigPanel__summaryLink" color="text" onClick={() => setState({ ...state, isOpen: !state.isOpen })}>{children}</EuiLink>
    </Draggable>
  );
  const changeOperation = (operationType: SelectOperator) => {
    const opDefinition = getOperationDefinition(operationType);
    onOperationChange(opDefinition.toSelectOperation(operation, visModel.datasource!.fields));
  };

  const sideNavItems = [
    {
      name: '',
      id: '0',
      items: operations
        .filter(
          ({ operator }) =>
            isApplicableForScale(operator, allowedScale) &&
            (!allowedCardinality || isApplicableForCardinality(operator, allowedCardinality))
        )
        .map(op => ({
          name: op.name,
          id: op.operator,
          isSelected: op.operator === operation.operator,
          onClick() {
            changeOperation(op.operator);
          },
        })),
    },
  ];

  const SubEditor = getOperationDefinition(operation.operator).editor as
    | React.ComponentType<OperationEditorProps<T>>
    | undefined;

  const subEditor = SubEditor ? (
    <EuiFlexItem className="lnsConfigPanel__summaryPopoverRight">
      <SubEditor {...props} />
    </EuiFlexItem>
  ) : null;

  return (
    <div className="lnsConfigPanel__summary">
      <EuiPopover
        className="lnsConfigPanel__summaryPopover"
        id="contextMenu"
        button={button}
        isOpen={state.isOpen}
        closePopover={close}
        anchorPosition="leftUp"
        withTitle
        panelPaddingSize="s"
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={!subEditor} className={`lnsConfigPanel__summaryPopoverLeft ${subEditor && 'lnsConfigPanel__summaryPopoverLeft--shaded'}`}>
            <EuiSideNav items={sideNavItems} />
          </EuiFlexItem>
          {subEditor}
        </EuiFlexGroup>
      </EuiPopover>
      {removable && (
        <EuiButtonIcon
          iconType="cross"
          iconSize="s"
          color="danger"
          aria-label="Remove"
          onClick={onOperationRemove}
        />
      )}
    </div>
  );
}
