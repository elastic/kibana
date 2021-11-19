/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DropResult } from '@elastic/eui';
import {
  EuiCallOut,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
  EuiIcon,
  euiDragDropReorder,
} from '@elastic/eui';
import React, { ReactNode } from 'react';
import { DiscoveryRule } from './discovery_rule';
import { DefaultDiscoveryRule } from './default_discovery_rule';
import { EditDiscoveryRule } from './edit_discovery_rule';
import { IDiscoveryRuleList, Operation } from '.';

interface Props {
  isEnabled: boolean;
  onToggleEnable: () => void;
  discoveryRuleList: IDiscoveryRuleList;
  setDiscoveryRuleList: (discoveryRuleItems: IDiscoveryRuleList) => void;
  onDelete: (discoveryItemId: string) => void;
  editDiscoveryRuleId: null | string;
  onEdit: (discoveryItemId: string) => void;
  onChangeOperation: (operationText: string) => void;
  stagedOperationText: string;
  onChangeType: (typeText: string) => void;
  stagedTypeText: string;
  onChangeProbe: (probeText: string) => void;
  stagedProbeText: string;
  onCancel: () => void;
  onSubmit: () => void;
  onAddRule: () => void;
  operationTypes: Operation[];
  toggleDescription: ReactNode;
  discoveryRulesDescription: ReactNode;
  showUnsavedWarning?: boolean;
}

export function RuntimeAttachment({
  isEnabled,
  onToggleEnable,
  discoveryRuleList,
  setDiscoveryRuleList,
  onDelete,
  editDiscoveryRuleId,
  onEdit,
  onChangeOperation,
  stagedOperationText,
  onChangeType,
  stagedTypeText,
  onChangeProbe,
  stagedProbeText,
  onCancel,
  onSubmit,
  onAddRule,
  operationTypes,
  toggleDescription,
  discoveryRulesDescription,
  showUnsavedWarning,
}: Props) {
  const onDragEnd = ({ source, destination }: DropResult) => {
    if (source && destination) {
      const items = euiDragDropReorder(
        discoveryRuleList,
        source.index,
        destination.index
      );

      setDiscoveryRuleList(items);
    }
  };
  return (
    <div>
      {showUnsavedWarning && (
        <>
          <EuiCallOut
            title={
              'You have unsaved changes. Click "Save integration" to sync changes to the integration.'
            }
            color="warning"
            iconType="iInCircle"
            size="s"
          />
          <EuiSpacer />
        </>
      )}
      <EuiSwitch
        label="Enable runtime attachment"
        checked={isEnabled}
        onChange={onToggleEnable}
      />
      <EuiSpacer size="s" />
      <EuiText color="subdued" size="s">
        <p>{toggleDescription}</p>
      </EuiText>
      {isEnabled && (
        <>
          <EuiSpacer size="l" />
          <EuiText size="s">
            <h3>Discovery rules</h3>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiIcon type="iInCircle" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <p>{discoveryRulesDescription}</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="plusInCircle"
                disabled={editDiscoveryRuleId !== null}
                onClick={onAddRule}
              >
                Add rule
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiDragDropContext onDragEnd={onDragEnd}>
            <EuiDroppable droppableId="RUNTIME_ATTACHMENT_DROPPABLE">
              {discoveryRuleList.map(({ discoveryRule, id }, idx) => (
                <EuiDraggable
                  spacing="m"
                  key={id}
                  index={idx}
                  draggableId={id}
                  customDragHandle={true}
                >
                  {(provided) =>
                    id === editDiscoveryRuleId ? (
                      <EditDiscoveryRule
                        id={editDiscoveryRuleId}
                        onChangeOperation={onChangeOperation}
                        operation={stagedOperationText}
                        onChangeType={onChangeType}
                        type={stagedTypeText}
                        onChangeProbe={onChangeProbe}
                        probe={stagedProbeText}
                        onCancel={onCancel}
                        onSubmit={onSubmit}
                        operationTypes={operationTypes}
                      />
                    ) : (
                      <DiscoveryRule
                        id={id}
                        order={idx + 1}
                        operation={discoveryRule.operation}
                        type={discoveryRule.type}
                        probe={discoveryRule.probe}
                        providedDragHandleProps={provided.dragHandleProps}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        operationTypes={operationTypes}
                      />
                    )
                  }
                </EuiDraggable>
              ))}
            </EuiDroppable>
          </EuiDragDropContext>
          <DefaultDiscoveryRule />
        </>
      )}
      <EuiSpacer size="s" />
    </div>
  );
}
