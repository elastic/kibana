/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useRef } from 'react';

import { useMappingsState, useDispatch } from '../../../mappings_state_context';
import { NormalizedField } from '../../../types';
import { FieldsListItem } from './fields_list_item';

interface Props {
  fieldId: string;
  treeDepth: number;
  isLastItem: boolean;
}

export const FieldsListItemContainer = ({ fieldId, treeDepth, isLastItem }: Props) => {
  const dispatch = useDispatch();
  const listElement = useRef<HTMLLIElement | null>(null);
  const {
    documentFields: { status, fieldToAddFieldTo, fieldToEdit },
    fields: { byId, maxNestedDepth, rootLevelFields },
    runtimeFields,
  } = useMappingsState();

  const getField = useCallback((id: string) => byId[id], [byId]);
  const runtimeFieldNames = Object.values(runtimeFields).map((field) => field.source.name);

  const field: NormalizedField = getField(fieldId);
  const { childFields } = field;
  const isHighlighted = fieldToEdit === fieldId;
  const isDimmed = status === 'editingField' && fieldToEdit !== fieldId;
  const isCreateFieldFormVisible = status === 'creatingField' && fieldToAddFieldTo === fieldId;
  const areActionButtonsVisible = status === 'idle';
  const childFieldsArray = useMemo(
    () => (childFields !== undefined ? childFields.map(getField) : []),
    [childFields, getField]
  );
  // Indicate if the field is shadowed by a runtime field with the same name
  // Currently this can only occur for **root level** fields.
  const isShadowed =
    rootLevelFields.includes(fieldId) && runtimeFieldNames.includes(field.source.name);

  const addField = useCallback(() => {
    dispatch({
      type: 'documentField.createField',
      value: fieldId,
    });
  }, [fieldId, dispatch]);

  const editField = useCallback(() => {
    dispatch({
      type: 'documentField.editField',
      value: fieldId,
    });
  }, [fieldId, dispatch]);

  const toggleExpand = useCallback(() => {
    dispatch({ type: 'field.toggleExpand', value: { fieldId } });
  }, [fieldId, dispatch]);

  return (
    <FieldsListItem
      ref={listElement}
      field={field}
      allFields={byId}
      treeDepth={treeDepth}
      isHighlighted={isHighlighted}
      isDimmed={isDimmed}
      isShadowed={isShadowed}
      isCreateFieldFormVisible={isCreateFieldFormVisible}
      areActionButtonsVisible={areActionButtonsVisible}
      isLastItem={isLastItem}
      childFieldsArray={childFieldsArray}
      maxNestedDepth={maxNestedDepth}
      addField={addField}
      editField={editField}
      toggleExpand={toggleExpand}
    />
  );
};
