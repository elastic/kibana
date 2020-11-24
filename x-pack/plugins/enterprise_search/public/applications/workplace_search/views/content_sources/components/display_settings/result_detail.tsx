/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import { DisplaySettingsLogic } from './DisplaySettingsLogic';

import { ExampleResultDetailCard } from './ExampleResultDetailCard';

export const ResultDetail: React.FC = () => {
  const {
    toggleFieldEditorModal,
    setDetailFields,
    openEditDetailField,
    removeDetailField,
  } = useActions(DisplaySettingsLogic);

  const {
    searchResultConfig: { detailFields },
    availableFieldOptions,
  } = useValues(DisplaySettingsLogic);

  return (
    <>
      <EuiSpacer />
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiSpacer size="m" />
          <EuiForm>
            <EuiFormRow>
              <>
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                  <EuiFlexItem>
                    <EuiTitle size="s">
                      <h3>Visible Fields</h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      color="primary"
                      onClick={toggleFieldEditorModal}
                      disabled={availableFieldOptions.length < 1}
                      data-test-subj="AddFieldButton"
                    >
                      Add Field
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                {detailFields.length > 0 ? (
                  <EuiDragDropContext onDragEnd={setDetailFields}>
                    <EuiDroppable
                      droppableId="visible_fields"
                      className="visible-fields-container"
                      withPanel={true}
                    >
                      <>
                        {detailFields.map(({ fieldName, label }, index) => (
                          <EuiDraggable
                            key={index}
                            index={index}
                            draggableId={`${fieldName}-${index}`}
                            customDragHandle={true}
                            spacing="m"
                          >
                            {(provided) => (
                              <EuiPanel>
                                <EuiFlexGroup alignItems="center">
                                  <EuiFlexItem grow={false}>
                                    <div {...provided.dragHandleProps}>
                                      <EuiIcon color="subdued" type="grab" />
                                    </div>
                                  </EuiFlexItem>
                                  <EuiFlexItem>
                                    <EuiTitle size="xs">
                                      <h4>{fieldName}</h4>
                                    </EuiTitle>
                                    <EuiTextColor color="subdued">
                                      <div>&ldquo;{label || ''}&rdquo;</div>
                                    </EuiTextColor>
                                  </EuiFlexItem>
                                  <EuiFlexItem grow={false}>
                                    <div>
                                      <EuiButtonIcon
                                        aria-label="Edit Field"
                                        iconType="pencil"
                                        onClick={() => openEditDetailField(index)}
                                      />
                                      <EuiButtonIcon
                                        aria-label="Remove Field"
                                        iconType="cross"
                                        onClick={() => removeDetailField(index)}
                                      />
                                    </div>
                                  </EuiFlexItem>
                                </EuiFlexGroup>
                              </EuiPanel>
                            )}
                          </EuiDraggable>
                        ))}
                      </>
                    </EuiDroppable>
                  </EuiDragDropContext>
                ) : (
                  <p>Add fields and move them into the order you want them to appear.</p>
                )}
              </>
            </EuiFormRow>
          </EuiForm>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel>
            <EuiTitle size="s">
              <h3>Preview</h3>
            </EuiTitle>
            <EuiSpacer />
            <ExampleResultDetailCard />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </>
  );
};
