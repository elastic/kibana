/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FieldsListItemContainer } from './fields_list_item_container';
import { NormalizedField, State } from '../../../types';
import { useMappingsState } from '../../../mappings_state_context';

interface Props {
  fields?: NormalizedField[];
  treeDepth?: number;
  staticState?: State;
  onMultiFieldToggleExpand?: (fieldId: string) => void;
}

export const FieldsList = React.memo(function FieldsListComponent({
  fields,
  treeDepth,
  staticState,
  onMultiFieldToggleExpand,
}: Props) {
  if (fields === undefined) {
    return null;
  }
  const state = staticState ?? useMappingsState();
  return (
    <ul className="mappingsEditor__fieldsList" data-test-subj="fieldsList">
      {fields.map((field, index) => (
        <FieldsListItemContainer
          key={field.id}
          fieldId={field.id}
          treeDepth={treeDepth === undefined ? 0 : treeDepth}
          isLastItem={index === fields.length - 1}
          state={state}
          onMultiFieldToggleExpand={onMultiFieldToggleExpand}
        />
      ))}
    </ul>
  );
});
