/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';

import { useMappingsState, useDispatch } from '../../mappings_state_context';
import { NormalizedRuntimeField } from '../../types';
import { RuntimeFieldsListItem } from './runtimefields_list_item';

interface Props {
  fieldId: string;
}

export const RuntimeFieldsListItemContainer = ({ fieldId }: Props) => {
  const dispatch = useDispatch();
  const {
    runtimeFieldsList: { status, fieldToEdit },
    runtimeFields,
  } = useMappingsState();

  const getField = useCallback((id: string) => runtimeFields[id], [runtimeFields]);

  const field: NormalizedRuntimeField = getField(fieldId);
  const isHighlighted = fieldToEdit === fieldId;
  const isDimmed = status === 'editingField' && fieldToEdit !== fieldId;
  const areActionButtonsVisible = status === 'idle';

  const editField = useCallback(() => {
    dispatch({
      type: 'runtimeFieldsList.editField',
      value: fieldId,
    });
  }, [fieldId, dispatch]);

  return (
    <RuntimeFieldsListItem
      field={field}
      isHighlighted={isHighlighted}
      isDimmed={isDimmed}
      areActionButtonsVisible={areActionButtonsVisible}
      editField={editField}
    />
  );
};
