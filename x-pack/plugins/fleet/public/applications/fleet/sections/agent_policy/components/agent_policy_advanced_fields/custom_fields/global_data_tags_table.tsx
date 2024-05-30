/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useState } from 'react';

import {
  EuiBasicTable,
  EuiBadge,
  EuiPanel,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiFormRow,
  EuiFieldText,
} from '@elastic/eui';

import type {
  NewAgentPolicy,
  AgentPolicy,
  GlobalDataTag,
} from '../../../../../../../../common/types';

interface Props {
  updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
  initialTags: GlobalDataTag[];
}

export const GlobalDataTagsTable: React.FunctionComponent<Props> = ({
  updateAgentPolicy,
  initialTags,
}) => {
  const [globalDataTags, setGlobalDataTags] = useState<GlobalDataTag[]>(initialTags);
  const [editIndexList, setEditIndexList] = useState<Set<number>>(new Set([]));

  // Indicates whether a new row is currently being added to the table.
  // When true, the table will display "Confirm" and "Cancel" actions for the new row
  // to allow the user to either confirm the addition or cancel it.
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newTag, setNewTag] = useState<GlobalDataTag>(null);

  const handleAddField = () => {
    setIsAdding(true);
    setNewTag({ name: '', value: '' });
  };

  const columns = [
    {
      field: 'name',
      name: 'Name',
      render: (name: string, item: GlobalDataTag) => {
        const index = globalDataTags.indexOf(item);
        const isEditing = editIndexList.has(index);
        const isAddingRow = isAdding && item === newTag;
        // const error = isAddingRow ? newTagErrors : errors[index] || {};
        return isEditing || isAddingRow ? (
          // <EuiFormRow isInvalid={!!error.name} error={error.name}>
          <EuiFormRow>
            <EuiFieldText
              placeholder="Enter name"
              value={isEditing ? globalDataTags[index].name : newTag.name}
              name="name"
            // onChange={(e) => (isEditing ? handleEditChange(e, index) : handleChange(e))}
            // isInvalid={!!error.name}
            />
          </EuiFormRow>
        ) : (
          <EuiBadge>{name}</EuiBadge>
        );
      },
    },
    {
      field: 'value',
      name: 'Value',
      render: (value: string, item: GlobalDataTag) => {
        const index = globalDataTags.indexOf(item);
        const isEditing = editIndexList.has(index);
        const isAddingRow = isAdding && item === newTag;
        // const error = isAddingRow ? newTagErrors : errors[index] || {};
        return isEditing || isAddingRow ? (
          // <EuiFormRow isInvalid={!!error.name} error={error.name}>
          <EuiFormRow>
            <EuiFieldText
              placeholder="Enter name"
              value={isEditing ? globalDataTags[index].value : newTag.value}
              name="value"
            // onChange={(e) => (isEditing ? handleEditChange(e, index) : handleChange(e))}
            // isInvalid={!!error.name}
            />
          </EuiFormRow>
        ) : (
          <EuiBadge>{value}</EuiBadge>
        );
      },
    },
  ];

  const items = isAdding ? [...globalDataTags, newTag] : globalDataTags;

  return (
    <>
      {globalDataTags.length === 0 && !isAdding ? (
        <EuiPanel>
          <EuiText>
            <h4>This policy has no custom fields</h4>
          </EuiText>
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="plusInCircle"
                onClick={handleAddField}
                style={{ marginTop: '16px' }}
              >
                Add field
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      ) : (
        <>
          <EuiBasicTable
            items={items}
            columns={columns}
            noItemsMessage="No global data tags available"
          />
          <EuiFlexGroup justifyContent="flexStart">
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="plusInCircle"
                onClick={handleAddField}
                style={{ marginTop: '16px' }}
                isDisabled={isAdding}
              >
                Add another field
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
