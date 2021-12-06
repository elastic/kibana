/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiBadge,
  EuiPanel,
  DraggableProvidedDragHandleProps,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { Operation } from '.';

interface Props {
  id: string;
  order: number;
  operation: string;
  type: string;
  probe: string;
  providedDragHandleProps?: DraggableProvidedDragHandleProps;
  onDelete: (discoveryItemId: string) => void;
  onEdit: (discoveryItemId: string) => void;
  operationTypes: Operation[];
}

export function DiscoveryRule({
  id,
  order,
  operation,
  type,
  probe,
  providedDragHandleProps,
  onDelete,
  onEdit,
  operationTypes,
}: Props) {
  const operationTypesLabels = useMemo(() => {
    return operationTypes.reduce((acc, current) => {
      return {
        ...acc,
        [current.operation.value]: {
          label: current.operation.label,
          types: current.types.reduce((memo, { value, label }) => {
            return { ...memo, [value]: label };
          }, {}),
        },
      };
    }, {} as { [operationValue: string]: { label: string; types: { [typeValue: string]: string } } });
  }, [operationTypes]);

  return (
    <EuiPanel paddingSize="m" hasBorder={true}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <div {...providedDragHandleProps} aria-label="Drag Handle">
            <EuiIcon type="grab" />
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="baseline">
            <EuiFlexItem grow={false}>
              <EuiBadge>{order}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={operation === 'exclude' ? 'danger' : 'success'}>
                {operationTypesLabels[operation].label}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <h4>{operationTypesLabels[operation].types[type]}</h4>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText>{probe}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ marginLeft: 'auto' }}>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    type="pencil"
                    color="primary"
                    onClick={() => {
                      onEdit(id);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    type="trash"
                    color="danger"
                    onClick={() => {
                      onDelete(id);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
