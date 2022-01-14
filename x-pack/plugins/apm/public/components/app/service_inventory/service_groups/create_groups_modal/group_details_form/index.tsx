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
import React, { useState } from 'react';
import type { GroupDetails as GroupDetailsType } from '..';

interface Props {
  onCloseModal: () => void;
  onClickNext: (groupDetails: GroupDetailsType) => void;
  groupDetails?: GroupDetailsType;
}

export function GroupDetails({
  onCloseModal,
  onClickNext,
  groupDetails,
}: Props) {
  const [name, setName] = useState<string>(groupDetails?.name || '');
  const [color, setColor] = useColorPickerState(
    groupDetails?.color || '#5094C4'
  );
  const [description, setDescription] = useState<string>(
    groupDetails?.description || ''
  );

  const isInvalid = !name;

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>
            {i18n.translate('xpack.apm.serviceGroups.groupDetailsForm.title', {
              defaultMessage: 'Create group',
            })}
          </h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.apm.serviceGroups.groupDetailsForm.name',
                    { defaultMessage: 'Name' }
                  )}
                  isInvalid={isInvalid}
                >
                  <EuiFieldText
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.apm.serviceGroups.groupDetailsForm.color',
                    { defaultMessage: 'Color' }
                  )}
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
        <EuiButtonEmpty onClick={onCloseModal}>
          {i18n.translate('xpack.apm.serviceGroups.groupDetailsForm.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          iconType="sortRight"
          iconSide="right"
          onClick={() => {
            onClickNext({
              name: name!, // name will always be defined at this point
              color,
              description,
            });
          }}
          isDisabled={isInvalid}
        >
          {i18n.translate(
            'xpack.apm.serviceGroups.groupDetailsForm.selectService',
            {
              defaultMessage: 'Select service',
            }
          )}
        </EuiButton>
      </EuiModalFooter>
    </>
  );
}
