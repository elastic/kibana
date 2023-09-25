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
  useEuiTheme,
} from '@elastic/eui';

import { css } from '@emotion/react';
import type { CustomFieldTypes, CustomFieldsConfiguration } from '../../../../common/types/domain';
import { builderMap } from '../builder';
import { DeleteConfirmationModal } from '../delete_confirmation_modal';

export interface Props {
  customFields: CustomFieldsConfiguration;
  onDeleteCustomField: (key: string) => void;
}

const CustomFieldsListComponent: React.FC<Props> = (props) => {
  const { customFields, onDeleteCustomField } = props;
  const { euiTheme } = useEuiTheme();
  const [showDeletionModal, setShowDeletionModal] = useState<{
    field?: { key: string; label: string };
    showModal: boolean;
  }>({ showModal: false });

  const renderTypeLabel = (type?: CustomFieldTypes) => {
    const createdBuilder = type && builderMap[type];

    return createdBuilder && createdBuilder().label;
  };

  const onConfirm = useCallback(() => {
    if (showDeletionModal.field?.key) {
      onDeleteCustomField(showDeletionModal.field.key);
    }

    setShowDeletionModal({ showModal: false });
  }, [onDeleteCustomField, setShowDeletionModal, showDeletionModal]);

  const onCancel = useCallback(() => {
    setShowDeletionModal({ showModal: false });
  }, []);

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem>
          {customFields.length ? (
            <EuiDragDropContext onDragEnd={() => {}}>
              <EuiDroppable droppableId="custom-fields-list-droppable" spacing="m">
                {customFields.map(({ key, type, label }, idx) => (
                  <EuiDraggable
                    spacing="m"
                    key={key}
                    index={idx}
                    draggableId={key}
                    customDragHandle={true}
                    hasInteractiveChildren={true}
                  >
                    {() => (
                      <EuiPanel
                        paddingSize="s"
                        data-test-subj={`custom-field-${label}-${type}`}
                        hasShadow={false}
                      >
                        <EuiFlexGroup alignItems="center" gutterSize="s">
                          <EuiFlexItem grow={false}>
                            <EuiIcon type="grab" />
                          </EuiFlexItem>
                          <EuiFlexItem grow={true}>
                            <EuiFlexGroup alignItems="center" gutterSize="s">
                              <EuiFlexItem grow={false}>
                                <EuiText
                                  css={css`
                                    font-weight: ${euiTheme.font.weight.bold};
                                  `}
                                >
                                  {label}
                                </EuiText>
                              </EuiFlexItem>
                              <EuiText color="subdued">{renderTypeLabel(type)}</EuiText>
                            </EuiFlexGroup>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiFlexGroup alignItems="flexEnd" gutterSize="s">
                              <EuiFlexItem grow={false}>
                                <EuiButtonIcon
                                  data-test-subj={`${key}-custom-field-delete`}
                                  iconType="minusInCircle"
                                  color="danger"
                                  onClick={() =>
                                    setShowDeletionModal({ field: { key, label }, showModal: true })
                                  }
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
        {showDeletionModal.showModal && showDeletionModal.field ? (
          <DeleteConfirmationModal
            label={showDeletionModal.field.label}
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
