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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef, useState } from 'react';
import type { StagedServiceGroup } from './save_modal';

interface Props {
  serviceGroup?: StagedServiceGroup;
  isEdit?: boolean;
  onCloseModal: () => void;
  onClickNext: (serviceGroup: StagedServiceGroup) => void;
  onDeleteGroup: () => void;
  isLoading: boolean;
}

export function GroupDetails({
  isEdit,
  serviceGroup,
  onCloseModal,
  onClickNext,
  onDeleteGroup,
  isLoading,
}: Props) {
  const [name, setName] = useState<string>(serviceGroup?.groupName || '');
  const [color, setColor, colorPickerErrors] = useColorPickerState(
    serviceGroup?.color || '#5094C4'
  );
  const [description, setDescription] = useState<string | undefined>(
    serviceGroup?.description
  );
  useEffect(() => {
    if (serviceGroup) {
      setName(serviceGroup.groupName);
      if (serviceGroup.color) {
        setColor(serviceGroup.color, {
          hex: serviceGroup.color,
          isValid: true,
        });
      }
      setDescription(serviceGroup.description);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceGroup]); // setColor omitted: new reference each render

  const isInvalidColor = !!colorPickerErrors?.length;
  const isInvalidName = !name;
  const isInvalid = isInvalidName || isInvalidColor;

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus(); // autofocus on initial render
  }, []);

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>
            {isEdit
              ? i18n.translate(
                  'xpack.apm.serviceGroups.groupDetailsForm.edit.title',
                  { defaultMessage: 'Edit group' }
                )
              : i18n.translate(
                  'xpack.apm.serviceGroups.groupDetailsForm.create.title',
                  { defaultMessage: 'Create group' }
                )}
          </h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.apm.serviceGroups.groupDetailsForm.name',
                    { defaultMessage: 'Name' }
                  )}
                  isInvalid={isInvalidName}
                >
                  <EuiFieldText
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                    }}
                    inputRef={inputRef}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.apm.serviceGroups.groupDetailsForm.color',
                    { defaultMessage: 'Color' }
                  )}
                  isInvalid={isInvalidColor}
                  error={
                    isInvalidColor
                      ? i18n.translate(
                          'xpack.apm.serviceGroups.groupDetailsForm.invalidColorError',
                          {
                            defaultMessage:
                              'Please provide a valid color value',
                          }
                        )
                      : undefined
                  }
                >
                  <EuiColorPicker onChange={setColor} color={color} />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.apm.serviceGroups.groupDetailsForm.description',
                { defaultMessage: 'Description' }
              )}
              labelAppend={
                <EuiText size="s" color="subdued">
                  {i18n.translate(
                    'xpack.apm.serviceGroups.groupDetailsForm.description.optional',
                    { defaultMessage: 'Optional' }
                  )}
                </EuiText>
              }
            >
              <EuiFieldText
                fullWidth
                value={description}
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
                isDisabled={isLoading}
              >
                {i18n.translate(
                  'xpack.apm.serviceGroups.groupDetailsForm.deleteGroup',
                  { defaultMessage: 'Delete group' }
                )}
              </EuiButton>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false} style={{ marginLeft: 'auto' }}>
            <EuiButtonEmpty onClick={onCloseModal} isDisabled={isLoading}>
              {i18n.translate(
                'xpack.apm.serviceGroups.groupDetailsForm.cancel',
                { defaultMessage: 'Cancel' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="sortRight"
              iconSide="right"
              onClick={() => {
                onClickNext({
                  groupName: name,
                  color,
                  description,
                  kuery: serviceGroup?.kuery ?? '',
                });
              }}
              isDisabled={isInvalid || isLoading}
            >
              {i18n.translate(
                'xpack.apm.serviceGroups.groupDetailsForm.selectServices',
                { defaultMessage: 'Select services' }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </>
  );
}
