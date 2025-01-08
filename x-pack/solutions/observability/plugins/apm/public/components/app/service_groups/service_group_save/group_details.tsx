/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiColorPicker,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  useColorPickerState,
  EuiText,
  isValidHex,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import type { StagedServiceGroup } from './save_modal';

interface Props {
  serviceGroup?: StagedServiceGroup;
  isEdit?: boolean;
  onCloseModal: () => void;
  onClickNext: (serviceGroup: StagedServiceGroup) => void;
  onDeleteGroup: () => void;
  isLoading: boolean;
  titleId?: string;
}

export function GroupDetails({
  isEdit,
  serviceGroup,
  onCloseModal,
  onClickNext,
  onDeleteGroup,
  isLoading,
  titleId,
}: Props) {
  const initialColor = serviceGroup?.color || '#5094C4';
  const [name, setName] = useState(serviceGroup?.groupName);
  const [color, setColor, colorPickerErrors] = useColorPickerState(initialColor);
  const [description, setDescription] = useState<string | undefined>(serviceGroup?.description);

  const isNamePristine = name === serviceGroup?.groupName;
  const isColorPristine = color === initialColor;

  useEffect(() => {
    if (serviceGroup) {
      setName(serviceGroup.groupName);
      if (serviceGroup.color) {
        setColor(serviceGroup.color, {
          hex: serviceGroup.color,
          isValid: isValidHex(color),
        });
      }
      setDescription(serviceGroup.description);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceGroup]); // setColor omitted: new reference each render

  const isInvalidColor = !!colorPickerErrors?.length || !isValidHex(color);
  const isInvalidName = !name;
  const isInvalid = isInvalidName || isInvalidColor;

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {isEdit
            ? i18n.translate('xpack.apm.serviceGroups.groupDetailsForm.edit.title', {
                defaultMessage: 'Edit group',
              })
            : i18n.translate('xpack.apm.serviceGroups.groupDetailsForm.create.title', {
                defaultMessage: 'Create group',
              })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow
                  label={i18n.translate('xpack.apm.serviceGroups.groupDetailsForm.name', {
                    defaultMessage: 'Name',
                  })}
                  isInvalid={!isNamePristine && isInvalidName}
                  error={
                    !isNamePristine && isInvalidName
                      ? i18n.translate(
                          'xpack.apm.serviceGroups.groupDetailsForm.invalidNameError',
                          {
                            defaultMessage: 'Please provide a valid name value',
                          }
                        )
                      : undefined
                  }
                >
                  <EuiFieldText
                    data-test-subj="apmGroupNameInput"
                    value={name || ''}
                    onChange={(e) => {
                      setName(e.target.value);
                    }}
                    isInvalid={!isNamePristine && isInvalidName}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  label={i18n.translate('xpack.apm.serviceGroups.groupDetailsForm.color', {
                    defaultMessage: 'Color',
                  })}
                  isInvalid={!isColorPristine && isInvalidColor}
                  error={
                    !isColorPristine && isInvalidColor
                      ? i18n.translate(
                          'xpack.apm.serviceGroups.groupDetailsForm.invalidColorError',
                          {
                            defaultMessage: 'Please provide a valid HEX color value',
                          }
                        )
                      : undefined
                  }
                >
                  <EuiColorPicker
                    onChange={setColor}
                    color={color}
                    isInvalid={!isColorPristine && isInvalidColor}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.apm.serviceGroups.groupDetailsForm.description', {
                defaultMessage: 'Description',
              })}
              labelAppend={
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.apm.serviceGroups.groupDetailsForm.description.optional', {
                    defaultMessage: 'Optional',
                  })}
                </EuiText>
              }
            >
              <EuiFieldText
                data-test-subj="apmGroupDetailsFieldText"
                fullWidth
                value={description || ''}
                onChange={(e) => {
                  setDescription(e.target.value);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup>
          {isEdit && (
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="trash"
                iconSide="left"
                onClick={() => {
                  onDeleteGroup();
                }}
                color="danger"
                isLoading={isLoading}
                isDisabled={isLoading}
                data-test-subj="apmDeleteGroupButton"
              >
                {i18n.translate('xpack.apm.serviceGroups.groupDetailsForm.deleteGroup', {
                  defaultMessage: 'Delete group',
                })}
              </EuiButton>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false} style={{ marginLeft: 'auto' }}>
            <EuiButtonEmpty
              data-test-subj="apmGroupDetailsCancelButton"
              onClick={onCloseModal}
              isLoading={isLoading}
              isDisabled={isLoading}
            >
              {i18n.translate('xpack.apm.serviceGroups.groupDetailsForm.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="apmGroupDetailsSelectServicesButton"
              fill
              iconType="sortRight"
              iconSide="right"
              onClick={() => {
                onClickNext({
                  groupName: name || '',
                  color,
                  description,
                  kuery: serviceGroup?.kuery ?? '',
                });
              }}
              isLoading={isLoading}
              isDisabled={isInvalid || isLoading}
            >
              {i18n.translate('xpack.apm.serviceGroups.groupDetailsForm.selectServices', {
                defaultMessage: 'Select services',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </>
  );
}
