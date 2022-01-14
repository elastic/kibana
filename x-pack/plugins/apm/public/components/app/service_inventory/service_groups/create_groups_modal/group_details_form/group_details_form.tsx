/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
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

export function GroupDetailsForm() {
  const [name, setName] = useState<string>();
  const [color, setColor] = useColorPickerState('#5094C4');
  const [description, setDescription] = useState<string>();

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate(
                'xpack.apm.serviceGroups.groupDetailsForm.name',
                { defaultMessage: 'Name' }
              )}
              isInvalid={!name}
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
  );
}
