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

import { ADD_FIELD_LABEL, EDIT_FIELD_LABEL, REMOVE_FIELD_LABEL } from '../../../../constants';
import { VISIBLE_FIELDS_TITLE, EMPTY_FIELDS_DESCRIPTION, PREVIEW_TITLE } from './constants';

import { DisplaySettingsLogic } from './display_settings_logic';

import { ExampleResultDetailCard } from './example_result_detail_card';

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
                      <h3>{VISIBLE_FIELDS_TITLE}</h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      color="primary"
                      onClick={toggleFieldEditorModal}
                      disabled={availableFieldOptions.length < 1}
                      data-test-subj="AddFieldButton"
                    >
                      {ADD_FIELD_LABEL}
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
                            key={`${fieldName}-${index}`}
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
                                        data-test-subj="EditFieldButton"
                                        aria-label={EDIT_FIELD_LABEL}
                                        iconType="pencil"
                                        onClick={() => openEditDetailField(index)}
                                      />
                                      <EuiButtonIcon
                                        data-test-subj="RemoveFieldButton"
                                        aria-label={REMOVE_FIELD_LABEL}
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
                  <p data-test-subj="EmptyFieldsDescription">{EMPTY_FIELDS_DESCRIPTION}</p>
                )}
              </>
            </EuiFormRow>
          </EuiForm>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel>
            <EuiTitle size="s">
              <h3>{PREVIEW_TITLE}</h3>
            </EuiTitle>
            <EuiSpacer />
            <ExampleResultDetailCard />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </>
  );
};
