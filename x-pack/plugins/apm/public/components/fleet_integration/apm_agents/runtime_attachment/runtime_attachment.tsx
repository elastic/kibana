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
import React from 'react';
import { DiscoveryRule } from './discovery_rule';
import { DefaultDiscoveryRule } from './default_discovery_rule';
import { EditDiscoveryRule } from './edit_discovery_rule';

interface DiscoveryRuleItem {
  id: string;
  content: {
    include: boolean;
    key: string;
    value: string;
  };
}

interface Props {
  isEnabled: boolean;
  onToggleEnable: () => void;
  list: DiscoveryRuleItem[];
  setList: (discoveryRuleItems: DiscoveryRuleItem[]) => void;
  onDelete: (discoveryItemId: string) => void;
  editItemId: null | string;
  onEdit: (discoveryItemId: null | string) => void;
  onChangeOperation: (operationText: string) => void;
  stagedOperationText: string;
  onChangeType: (typeText: string) => void;
  stagedTypeText: string;
  onChangeProbe: (probeText: string) => void;
  stagedProbeText: string;
  onCancel: () => void;
  onSubmit: () => void;
  onAddRule: () => void;
}

export function RuntimeAttachment({
  isEnabled,
  onToggleEnable,
  list,
  setList,
  onDelete,
  editItemId,
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
}: Props) {
  const onDragEnd = ({ source, destination }: DropResult) => {
    if (source && destination) {
      const items = euiDragDropReorder(list, source.index, destination.index);

      setList(items);
    }
  };
  return (
    <div>
      <EuiCallOut
        title={
          'You have unsaved changes. Click "Save integration" to sync changes to the integration.'
        }
        color="warning"
        iconType="iInCircle"
        size="s"
      />
      <EuiSpacer />
      <EuiSwitch
        label="Enable runtime attachment"
        checked={isEnabled}
        onChange={onToggleEnable}
      />
      <EuiSpacer size="s" />
      <EuiText color="subdued" size="s">
        <p>Attach the Java agent to running and starting Java applications.</p>
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
                <p>
                  For every running JVM, the discovery rules are evaluated in
                  the order they are provided. The first matching rule
                  determines the outcome. Learn more in the docs.
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="plusInCircle"
                disabled={editItemId !== null}
                onClick={onAddRule}
              >
                Add rule
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiDragDropContext onDragEnd={onDragEnd}>
            <EuiDroppable
              droppableId="CUSTOM_HANDLE_DROPPABLE_AREA"
              spacing="m"
            >
              {list.map(({ content, id }, idx) => (
                <EuiDraggable
                  spacing="m"
                  key={id}
                  index={idx}
                  draggableId={id}
                  customDragHandle={true}
                >
                  {(provided) =>
                    id === editItemId ? (
                      <EditDiscoveryRule
                        id={editItemId}
                        onChangeOperation={onChangeOperation}
                        operation={stagedOperationText}
                        onChangeType={onChangeType}
                        type={stagedTypeText}
                        onChangeProbe={onChangeProbe}
                        probe={stagedProbeText}
                        onCancel={onCancel}
                        onSubmit={onSubmit}
                      />
                    ) : (
                      <DiscoveryRule
                        id={id}
                        order={idx + 1}
                        include={content.include}
                        ruleKey={content.key}
                        ruleValue={content.value}
                        providedDragHandleProps={provided.dragHandleProps}
                        onDelete={onDelete}
                        onEdit={onEdit}
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
