/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiText,
  EuiBadge,
  EuiPanel,
  EuiOverlayMask,
  EuiConfirmModal,
} from '@elastic/eui';

import type { NewAgentPolicy, AgentPolicy, GlobalDataTag } from '../../../../../../../common/types';

interface Props {
  updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
  initialTags: GlobalDataTag[];
}

export const GlobalDataTagsTable: React.FC<Props> = ({ updateAgentPolicy, initialTags }) => {
  const [globalDataTags, setGlobalDataTags] = useState<GlobalDataTag[]>(initialTags);
  const [newTag, setNewTag] = useState<GlobalDataTag>({ name: '', value: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndices, setEditingIndices] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<
    Record<number, { name: string | null; value: string | null }>
  >({});
  const [newTagErrors, setNewTagErrors] = useState<{ name: string | null; value: string | null }>({
    name: null,
    value: null,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const handleAddField = () => {
    setIsAdding(true);
    setNewTag({ name: '', value: '' });
    setNewTagErrors({ name: null, value: null });
  };

  const validateTag = (tag: GlobalDataTag, index?: number) => {
    const trimmedName = tag.name.trim();
    const trimmedValue = tag.value.toString().trim();
    let nameError = null;
    let valueError = null;

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

  const handleConfirm = () => {
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
    setNewTagErrors({ name: null, value: null });
  };

  const handleCancel = () => {
    setNewTag({ name: '', value: '' });
    setIsAdding(false);
    setNewTagErrors({ name: null, value: null });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTag({
      ...newTag,
      [e.target.name]: e.target.value,
    });
    setNewTagErrors({ ...newTagErrors, [e.target.name]: null });
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

  const handleDelete = (index: number) => {
    const updatedTags = globalDataTags.filter((_, i) => i !== index);
    setGlobalDataTags(updatedTags);
    updateAgentPolicy({ global_data_tags: updatedTags });
    setEditingIndices((prevIndices) => {
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

  const handleEdit = (index: number) => {
    setEditingIndices((prevIndices) => new Set(prevIndices.add(index)));
    setErrors((prevErrors) => ({
      ...prevErrors,
      [index]: { name: null, value: null },
    }));
  };

  const handleSaveEdit = (index: number) => {
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
    setEditingIndices((prevIndices) => {
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

  const handleCancelEdit = (index: number) => {
    setEditingIndices((prevIndices) => {
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

  const confirmModal = (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={`Remove the ${globalDataTags[deleteIndex]?.name} field?`}
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

  const panelStyle = {
    backgroundColor: '#f5f7fa',
    textAlign: 'center',
    padding: '20px',
    borderRadius: '8px',
  };

  const columns = [
    {
      field: 'name',
      name: 'Name',
      render: (name: string, item: GlobalDataTag) => {
        const index = globalDataTags.indexOf(item);
        const isEditing = editingIndices.has(index);
        const isAddingRow = isAdding && item === newTag;
        const error = isAddingRow ? newTagErrors : errors[index] || {};
        return isEditing || isAddingRow ? (
          <EuiFormRow isInvalid={!!error.name} error={error.name}>
            <EuiFieldText
              placeholder="Enter name"
              value={isEditing ? globalDataTags[index].name : newTag.name}
              name="name"
              onChange={(e) => (isEditing ? handleEditChange(e, index) : handleChange(e))}
              isInvalid={!!error.name}
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
      render: (value: string | number, item: GlobalDataTag) => {
        const index = globalDataTags.indexOf(item);
        const isEditing = editingIndices.has(index);
        const isAddingRow = isAdding && item === newTag;
        const error = isAddingRow ? newTagErrors : errors[index] || {};
        return isEditing || isAddingRow ? (
          <EuiFormRow isInvalid={!!error.value} error={error.value}>
            <EuiFieldText
              placeholder="Enter value"
              value={isEditing ? globalDataTags[index].value.toString() : newTag.value.toString()}
              name="value"
              onChange={(e) => (isEditing ? handleEditChange(e, index) : handleChange(e))}
              isInvalid={!!error.value}
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
            if (editingIndices.has(index) || (isAdding && item === newTag)) {
              return (
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      size="s"
                      color="primary"
                      iconType="checkInCircleFilled"
                      onClick={isAdding ? handleConfirm : () => handleSaveEdit(index)}
                      aria-label="Confirm"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              );
            }
            return (
              <EuiButtonIcon
                aria-label="Edit"
                iconType="pencil"
                color="text"
                onClick={() => handleEdit(index)}
              />
            );
          },
        },
        {
          name: 'Cancel/Delete',
          render: (item: GlobalDataTag) => {
            const index = globalDataTags.indexOf(item);
            if (editingIndices.has(index) || (isAdding && item === newTag)) {
              return (
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      size="s"
                      color="danger"
                      iconType="cross"
                      onClick={isAdding ? handleCancel : () => handleCancelEdit(index)}
                      aria-label="Cancel"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              );
            }
            return (
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
        <EuiPanel style={panelStyle} hasShadow={false}>
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
      {isModalVisible && confirmModal}
    </>
  );
};
