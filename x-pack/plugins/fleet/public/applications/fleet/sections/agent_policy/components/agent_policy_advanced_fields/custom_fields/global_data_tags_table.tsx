/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  EuiBasicTable,
  EuiPanel,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiFormRow,
  EuiFieldText,
  EuiButtonIcon,
  EuiCode,
  type EuiBasicTableColumn,
} from '@elastic/eui';

import { useStartServices } from '../../../../../../../hooks';

import type {
  NewAgentPolicy,
  AgentPolicy,
  GlobalDataTag,
} from '../../../../../../../../common/types';

interface Props {
  updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
  globalDataTags: GlobalDataTag[];
  isDisabled?: boolean;
}

function parseValue(value: string | number): string | number {
  if (typeof value === 'number') {
    return value;
  }
  if (!value.match(/^[0-9]*$/)) {
    return value.trim();
  }
  const parsedValue = Number(value);
  return isNaN(parsedValue) ? value.trim() : parsedValue;
}

export const GlobalDataTagsTable: React.FunctionComponent<Props> = ({
  updateAgentPolicy,
  globalDataTags,
  isDisabled,
}) => {
  const { overlays } = useStartServices();
  const [editTags, setEditTags] = useState<{ [k: number]: GlobalDataTag }>({});
  // isAdding indicates whether a new row is currently being added to the table.
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

  const handleAddField = () => {
    setIsAdding(true);
    setNewTag({ name: '', value: '' });
  };

  const handleEditChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newTargetValue = e.target.value;
    const newTargetName = e.target.name;

    setEditTags((prevValue) => {
      let tag = prevValue[index];
      if (!tag) {
        tag = { name: '', value: '' };
      }
      return {
        ...prevValue,
        [index]: { ...tag, [newTargetName]: newTargetValue },
      };
    });
    setErrors((prevErrors) => ({
      ...prevErrors,
      [index]: { ...prevErrors[index], [newTargetName]: null },
    }));
  }, []);

  const handleNewTagChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewTag({
        ...newTag,
        [e.target.name]: e.target.value,
      });
      setNewTagErrors({ ...newTagErrors, [e.target.name]: null });
    },
    [newTag, newTagErrors]
  );

  const validateTag = useCallback(
    (tag: GlobalDataTag, index?: number) => {
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
    },
    [globalDataTags]
  );

  const confirmNewTagChanges = useCallback(() => {
    const { nameError, valueError, isValid } = validateTag(newTag);
    if (!isValid) {
      setNewTagErrors({ name: nameError, value: valueError });
      return;
    }

    const updatedTags = [
      ...globalDataTags,
      { ...newTag, name: newTag.name.trim(), value: parseValue(newTag.value) },
    ];

    updateAgentPolicy({ global_data_tags: updatedTags });
    setNewTag({ name: '', value: '' });
    setIsAdding(false);
    setNewTagErrors({ name: '', value: '' });
  }, [globalDataTags, newTag, updateAgentPolicy, validateTag]);

  const confirmEditChanges = useCallback(
    (index: number) => {
      const tag = editTags[index];
      const { nameError, valueError, isValid } = validateTag(tag, index);

      if (!isValid) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          [index]: { name: nameError, value: valueError },
        }));
        return;
      }

      const updatedTags = globalDataTags.map((t, i) =>
        i === index ? { ...tag, name: tag.name.trim(), value: parseValue(tag.value) } : t
      );
      updateAgentPolicy({ global_data_tags: updatedTags });
      setEditTags((prevValue) => {
        const newValue = { ...prevValue };
        delete newValue[index];

        return newValue;
      });
      setErrors((prevErrors) => {
        const newErrors = { ...prevErrors };
        delete newErrors[index];
        return newErrors;
      });
    },
    [globalDataTags, updateAgentPolicy, validateTag, editTags]
  );

  const handleStartEdit = useCallback(
    (index: number) => {
      setEditTags((prevValue) => ({
        ...prevValue,
        [index]: { ...globalDataTags[index] },
      }));
      setErrors((prevErrors: Record<number, { name: string | null; value: string | null }>) => ({
        ...prevErrors,
        [index]: { name: null, value: null },
      }));
    },
    [globalDataTags]
  );

  const cancelNewTagChanges = () => {
    setNewTag({ name: '', value: '' });
    setIsAdding(false);
    setNewTagErrors({ name: '', value: '' });
  };

  const cancelEditChanges = (index: number) => {
    setEditTags((prevValue) => {
      const newValue = { ...prevValue };
      delete newValue[index];

      return newValue;
    });
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      delete newErrors[index];
      return newErrors;
    });
  };

  const deleteTag = useCallback(
    async (index: number) => {
      const res = await overlays.openConfirm(
        i18n.translate('xpack.fleet.globalDataTagsTable.deleteModalText', {
          defaultMessage:
            'Removing the field will affect the next sync. This action cannot be undone.',
        }),
        {
          title: i18n.translate('xpack.fleet.globalDataTagsTable.deleteModalTitle', {
            defaultMessage: 'Remove the {tag} field?',
            values: {
              tag: globalDataTags[index].name ?? '',
            },
          }),
          buttonColor: 'danger',
          cancelButtonText: i18n.translate(
            'xpack.fleet.globalDataTagsTable.deleteModalCancelButtonText',
            {
              defaultMessage: 'Cancel',
            }
          ),
          confirmButtonText: i18n.translate(
            'xpack.fleet.globalDataTagsTable.deleteModalConfirmButtonText',
            {
              defaultMessage: 'Remove',
            }
          ),
        }
      );
      if (!res) {
        return;
      }
      const updatedTags = globalDataTags.filter((_, i) => i !== index);
      setEditTags((prevValue) => {
        const newValue = { ...prevValue };
        delete newValue[index];

        return newValue;
      });
      updateAgentPolicy({ global_data_tags: updatedTags });

      setErrors((prevErrors) => {
        const { [index]: removedError, ...remainingErrors } = prevErrors;
        return remainingErrors;
      });
    },
    [globalDataTags, overlays, updateAgentPolicy]
  );

  const columns = useMemo(
    (): Array<EuiBasicTableColumn<GlobalDataTag>> => [
      {
        valign: 'top',
        field: 'name',
        name: (
          <FormattedMessage
            id="xpack.fleet.globalDataTagsTable.nameColumnName"
            defaultMessage="Name"
          />
        ),
        render: (name: string, item: GlobalDataTag) => {
          const index = globalDataTags.indexOf(item);
          const isEditing = !!editTags[index];
          const isAddingRow = isAdding && item === newTag;
          const error = isAddingRow ? newTagErrors : errors[index] || {};
          return isEditing || isAddingRow ? (
            <EuiFormRow isInvalid={!!error.name} error={error.name}>
              <EuiFieldText
                placeholder={i18n.translate('xpack.fleet.globalDataTagsTable.namePlaceholder', {
                  defaultMessage: 'Name',
                })}
                data-test-subj="globalDataTagsNameInput"
                value={isEditing ? editTags[index].name : newTag.name}
                name="name"
                onChange={(e) => (isEditing ? handleEditChange(e, index) : handleNewTagChange(e))}
                isInvalid={!!error.name}
                compressed={true}
              />
            </EuiFormRow>
          ) : (
            <EuiCode>{name}</EuiCode>
          );
        },
      },
      {
        valign: 'top',
        field: 'value',
        name: (
          <FormattedMessage
            id="xpack.fleet.globalDataTagsTable.ValueColumnName"
            defaultMessage="Value"
          />
        ),
        render: (value: string, item: GlobalDataTag) => {
          const index = globalDataTags.indexOf(item);
          const isEditing = !!editTags[index];
          const isAddingRow = isAdding && item === newTag;
          const error = isAddingRow ? newTagErrors : errors[index] || {};
          return isEditing || isAddingRow ? (
            <EuiFormRow isInvalid={!!error.value} error={error.value}>
              <EuiFieldText
                placeholder={i18n.translate('xpack.fleet.globalDataTagsTable.valuePlaceHolder', {
                  defaultMessage: 'Value',
                })}
                data-test-subj="globalDataTagsValueInput"
                value={isEditing ? editTags[index].value : newTag.value}
                name="value"
                onChange={(e) => (isEditing ? handleEditChange(e, index) : handleNewTagChange(e))}
                isInvalid={!!error.value}
                compressed={true}
              />
            </EuiFormRow>
          ) : (
            <EuiCode>{value}</EuiCode>
          );
        },
      },
      {
        actions: [
          {
            name: (
              <FormattedMessage
                id="xpack.fleet.globalDataTagsTable.ActionsColumnName"
                defaultMessage="Confirm/Edit"
              />
            ),
            render: (item: GlobalDataTag) => {
              const index = globalDataTags.indexOf(item);
              const isEditing = !!editTags[index];
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
                  data-test-subj={`globalDataTagEditField${index}Btn`}
                  isDisabled={isDisabled}
                  onClick={() => handleStartEdit(index)}
                />
              );
            },
          },
          {
            name: 'Cancel/Delete',
            render: (item: GlobalDataTag) => {
              const index = globalDataTags.indexOf(item);
              const isEditing = !!editTags[index];
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
                  data-test-subj={`globalDataTagDeleteField${index}Btn`}
                  isDisabled={isDisabled}
                  onClick={() => deleteTag(index)}
                />
              );
            },
          },
        ],
      },
    ],
    [
      confirmEditChanges,
      confirmNewTagChanges,
      editTags,
      errors,
      globalDataTags,
      handleEditChange,
      handleNewTagChange,
      isAdding,
      newTag,
      newTagErrors,
      deleteTag,
      handleStartEdit,
      isDisabled,
    ]
  );

  const items = isAdding ? [...globalDataTags, newTag] : globalDataTags;

  return (
    <>
      {globalDataTags.length === 0 && !isAdding ? (
        <EuiPanel hasShadow={false}>
          <EuiText>
            <h4>
              <FormattedMessage
                id="xpack.fleet.globalDataTagsTable.noFieldsMessage"
                defaultMessage="This policy has no custom fields"
              />
            </h4>
          </EuiText>
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="plusInCircle"
                onClick={handleAddField}
                style={{ marginTop: '16px' }}
                disabled={isDisabled}
                data-test-subj="globalDataTagAddFieldBtn"
              >
                <FormattedMessage
                  id="xpack.fleet.globalDataTagsTable.addFieldBtn"
                  defaultMessage="Add field"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      ) : (
        <>
          <EuiBasicTable items={items} columns={columns} />
          <EuiFlexGroup justifyContent="flexStart">
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="plusInCircle"
                onClick={handleAddField}
                style={{ marginTop: '16px' }}
                isDisabled={isDisabled || isAdding}
                data-test-subj="globalDataTagAddAnotherFieldBtn"
              >
                <FormattedMessage
                  id="xpack.fleet.globalDataTagsTable.addAnotherFieldBtn"
                  defaultMessage="Add another field"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
