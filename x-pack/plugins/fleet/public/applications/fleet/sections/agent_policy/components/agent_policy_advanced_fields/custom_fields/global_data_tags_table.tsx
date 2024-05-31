/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

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
  EuiButtonIcon,
  EuiOverlayMask,
  EuiConfirmModal,
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
  const [newTag, setNewTag] = useState<GlobalDataTag>({ name: '', value: '' });
  const [newTagErrors, setNewTagErrors] = useState<{ name: string; value: string }>({
    name: '',
    value: '',
  });
  const [errors, setErrors] = useState<
    Record<number, { name: string | null; value: string | null }>
  >({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // Necessary to remove uncommitted tags after save is cancelled
  useEffect(() => {
    setGlobalDataTags(initialTags);
  }, [initialTags]);

  const handleAddField = () => {
    setIsAdding(true);
    setNewTag({ name: '', value: '' });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const updatedTags = globalDataTags.map((tag, i) =>
      i === index ? { ...tag, [e.target.name]: e.target.value } : tag
    );
    setGlobalDataTags(updatedTags);
    setErrors((prevErrors) => ({
      ...prevErrors,
      [index]: { ...prevErrors[index], [e.target.name]: null },
    }));
  };

  const handleNewTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTag({
      ...newTag,
      [e.target.name]: e.target.value,
    });
    setNewTagErrors({ ...newTagErrors, [e.target.name]: null });
  };

  const validateTag = (tag: GlobalDataTag, index?: number) => {
    const trimmedName = tag.name.trim();
    const trimmedValue = tag.value.toString().trim();

    let nameError = '';
    let valueError = '';

    if (!trimmedName) {
      nameError = 'Name cannot be empty';
    } else if (/\s/.test(trimmedName)) {
      nameError = 'Name cannot contain spaces';
    } else if (globalDataTags.some((t, i) => i !== index && t.name === trimmedName)) {
      nameError = 'Name must be unique';
    }

    if (!trimmedValue) {
      valueError = 'Value cannot be empty';
    }

    return { nameError, valueError, isValid: !nameError && !valueError };
  };

  const confirmNewTagChanges = () => {
    const { nameError, valueError, isValid } = validateTag(newTag);
    if (!isValid) {
      setNewTagErrors({ name: nameError, value: valueError });
      return;
    }

    const updatedTags = [
      ...globalDataTags,
      { ...newTag, name: newTag.name.trim(), value: newTag.value.toString().trim() },
    ];

    setGlobalDataTags(updatedTags);
    updateAgentPolicy({ global_data_tags: updatedTags });
    setNewTag({ name: '', value: '' });
    setIsAdding(false);
    setNewTagErrors({ name: '', value: '' });
  };

  const confirmEditChanges = (index: number) => {
    const tag = globalDataTags[index];
    const { nameError, valueError, isValid } = validateTag(tag, index);

    if (!isValid) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [index]: { name: nameError, value: valueError },
      }));
      return;
    }

    const updatedTags = globalDataTags.map((t, i) =>
      i === index ? { ...tag, name: tag.name.trim(), value: tag.value.toString().trim() } : t
    );
    setGlobalDataTags(updatedTags);
    updateAgentPolicy({ global_data_tags: updatedTags });
    setEditIndexList((prevIndices: Set<number>) => {
      const newIndices = new Set(prevIndices);
      newIndices.delete(index);
      return newIndices;
    });
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      delete newErrors[index];
      return newErrors;
    });
  };

  const handleStartEdit = (index: number) => {
    setEditIndexList((prevIndices) => new Set(prevIndices.add(index)));
    setErrors((prevErrors: Record<number, { name: string | null; value: string | null }>) => ({
      ...prevErrors,
      [index]: { name: null, value: null },
    }));
  };

  const cancelNewTagChanges = () => {
    setNewTag({ name: '', value: '' });
    setIsAdding(false);
    setNewTagErrors({ name: '', value: '' });
  };

  const cancelEditChanges = (index: number) => {
    setEditIndexList((prevIndices) => {
      const newIndices = new Set(prevIndices);
      newIndices.delete(index);
      return newIndices;
    });
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      delete newErrors[index];
      return newErrors;
    });
  };

  const showModal = (index: number) => {
    setDeleteIndex(index);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setDeleteIndex(null);
  };

  const handleDelete = (index: number) => {
    const updatedTags = globalDataTags.filter((_, i) => i !== index);
    setGlobalDataTags(updatedTags);
    updateAgentPolicy({ global_data_tags: updatedTags });
    setEditIndexList((prevIndices: Set<number>) => {
      const newIndices = new Set(prevIndices);
      newIndices.delete(index);
      return newIndices;
    });
    setErrors((prevErrors) => {
      const { [index]: removedError, ...remainingErrors } = prevErrors;
      return remainingErrors;
    });
    closeModal();
  };

  const deleteConfirmModal = (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={`Remove the ${deleteIndex ? globalDataTags[deleteIndex].name : ''} field?`}
        onCancel={closeModal}
        onConfirm={() => handleDelete(deleteIndex!)}
        cancelButtonText="Cancel"
        confirmButtonText="Remove"
        buttonColor="danger"
        defaultFocusedButton="confirm"
      >
        <p>Removing the field will affect the next sync. This action cannot be undone.</p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );

  const badgeStyle = {
    backgroundColor: '#f5f7fa',
    color: '#6a52b3',
  };

  const columns = [
    {
      field: 'name',
      name: 'Name',
      render: (name: string, item: GlobalDataTag) => {
        const index = globalDataTags.indexOf(item);
        const isEditing = editIndexList.has(index);
        const isAddingRow = isAdding && item === newTag;
        const error = isAddingRow ? newTagErrors : errors[index] || {};
        return isEditing || isAddingRow ? (
          <EuiFormRow isInvalid={!!error.name} error={error.name}>
            <EuiFieldText
              placeholder="Enter name"
              value={isEditing ? globalDataTags[index].name : newTag.name}
              name="name"
              onChange={(e) => (isEditing ? handleEditChange(e, index) : handleNewTagChange(e))}
              isInvalid={!!error.name}
              compressed={true}
            />
          </EuiFormRow>
        ) : (
          <EuiBadge style={badgeStyle}>{name}</EuiBadge>
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
        const error = isAddingRow ? newTagErrors : errors[index] || {};
        return isEditing || isAddingRow ? (
          <EuiFormRow isInvalid={!!error.value} error={error.value}>
            <EuiFieldText
              placeholder="Enter name"
              value={isEditing ? globalDataTags[index].value : newTag.value}
              name="value"
              onChange={(e) => (isEditing ? handleEditChange(e, index) : handleNewTagChange(e))}
              isInvalid={!!error.name}
              compressed={true}
            />
          </EuiFormRow>
        ) : (
          <EuiBadge style={badgeStyle}>{value}</EuiBadge>
        );
      },
    },
    {
      actions: [
        {
          name: 'Confirm/Edit',
          render: (item: GlobalDataTag) => {
            const index = globalDataTags.indexOf(item);
            const isEditing = editIndexList.has(index);
            const isAddingRow = isAdding && item === newTag;
            return isEditing || isAddingRow ? (
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    size="xs"
                    color="primary"
                    iconType="checkInCircleFilled"
                    onClick={isAdding ? confirmNewTagChanges : () => confirmEditChanges(index)}
                    aria-label="Confirm"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiButtonIcon
                aria-label="Edit"
                iconType="pencil"
                color="text"
                onClick={() => handleStartEdit(index)}
              />
            );
          },
        },
        {
          name: 'Cancel/Delete',
          render: (item: GlobalDataTag) => {
            const index = globalDataTags.indexOf(item);
            const isEditing = editIndexList.has(index);
            const isAddingRow = isAdding && item === newTag;

            return isEditing || isAddingRow ? (
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    size="xs"
                    color="danger"
                    iconType="errorFilled"
                    onClick={isAddingRow ? cancelNewTagChanges : () => cancelEditChanges(index)}
                    aria-label="Cancel"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiButtonIcon
                aria-label="Delete"
                iconType="trash"
                color="text"
                onClick={() => showModal(index)}
              />
            );
          },
        },
      ],
    },
  ];

  const items = isAdding ? [...globalDataTags, newTag] : globalDataTags;

  return (
    <>
      {globalDataTags.length === 0 && !isAdding ? (
        <EuiPanel hasShadow={false}>
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
      {isModalVisible && deleteConfirmModal}
    </>
  );
};
