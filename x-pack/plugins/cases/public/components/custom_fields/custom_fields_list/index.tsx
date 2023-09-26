/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiIcon,
  EuiButtonIcon,
} from '@elastic/eui';

import type { CustomFieldTypes, CustomFieldsConfiguration } from '../../../../common/types/domain';
import { builderMap } from '../builder';
import { DeleteConfirmationModal } from '../delete_confirmation_modal';

export interface Props {
  customFields: CustomFieldsConfiguration;
  onDeleteCustomField: (key: string) => void;
}

const CustomFieldsListComponent: React.FC<Props> = (props) => {
  const { customFields, onDeleteCustomField } = props;
  const [selectedItem, setSelectedItem] = useState<CustomFieldsConfiguration[number] | null>(null);

  const renderTypeLabel = (type?: CustomFieldTypes) => {
    const createdBuilder = type && builderMap[type];

    return createdBuilder && createdBuilder().label;
  };

  const onConfirm = useCallback(() => {
    if (selectedItem) {
      onDeleteCustomField(selectedItem.key);
    }

    setSelectedItem(null);
  }, [onDeleteCustomField, setSelectedItem, selectedItem]);

  const onCancel = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const showModal = Boolean(selectedItem);

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem>
          {customFields.length ? (
            <EuiDragDropContext onDragEnd={() => {}}>
              <EuiDroppable droppableId="custom-fields-list-droppable" spacing="m">
                {customFields.map((customField, idx) => (
                  <EuiDraggable
                    spacing="m"
                    key={customField.key}
                    index={idx}
                    draggableId={customField.key}
                    customDragHandle={true}
                    hasInteractiveChildren={true}
                  >
                    {() => (
                      <EuiPanel
                        paddingSize="s"
                        data-test-subj={`custom-field-${customField.label}-${customField.type}`}
                        hasShadow={false}
                      >
                        <EuiFlexGroup alignItems="center" gutterSize="s">
                          <EuiFlexItem grow={false}>
                            <EuiIcon type="grab" />
                          </EuiFlexItem>
                          <EuiFlexItem grow={true}>
                            <EuiFlexGroup alignItems="center" gutterSize="s">
                              <EuiFlexItem grow={false}>
                                <EuiText>
                                  <h4>{customField.label}</h4>
                                </EuiText>
                              </EuiFlexItem>
                              <EuiText color="subdued">{renderTypeLabel(customField.type)}</EuiText>
                            </EuiFlexGroup>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiFlexGroup alignItems="flexEnd" gutterSize="s">
                              <EuiFlexItem grow={false}>
                                <EuiButtonIcon
                                  data-test-subj={`${customField.key}-custom-field-delete`}
                                  iconType="minusInCircle"
                                  color="danger"
                                  onClick={() => setSelectedItem(customField)}
                                />
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiPanel>
                    )}
                  </EuiDraggable>
                ))}
              </EuiDroppable>
            </EuiDragDropContext>
          ) : null}
        </EuiFlexItem>
        {showModal && selectedItem ? (
          <DeleteConfirmationModal
            label={selectedItem.label}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        ) : null}
      </EuiFlexGroup>
    </>
  );
};

CustomFieldsListComponent.displayName = 'CustomFieldsList';

export const CustomFieldsList = React.memo(CustomFieldsListComponent);
