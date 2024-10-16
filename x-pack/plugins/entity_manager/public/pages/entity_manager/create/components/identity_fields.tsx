/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Control, Controller, useFieldArray } from 'react-hook-form';
import { EntityDefinition } from '@kbn/entities-schema';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiButtonIcon,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';

export function IdentityFieldsInput({ control }: { control: Control<EntityDefinition> }) {
  const identityFormFields = useFieldArray({ control, name: 'identityFields' });

  return (
    <EuiFormRow
      label="Group by"
      labelAppend={
        <EuiButtonIcon
          iconType="plus"
          onClick={() => identityFormFields.append({ field: '', optional: false })}
        />
      }
    >
      <>
        {identityFormFields.fields.map((item, index) => {
          return (
            <Controller
              control={control}
              name={`identityFields.${index}.field`}
              rules={{ required: true }}
              render={({ fieldState }) => (
                <>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem>
                      <EuiFieldText
                        key={index}
                        value={item.field}
                        onChange={(e) =>
                          identityFormFields.update(index, { ...item, field: e.target.value })
                        }
                        fullWidth
                        isInvalid={fieldState.invalid}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      {identityFormFields.fields.length > 1 ? (
                        <EuiButtonIcon
                          iconType="trash"
                          color="danger"
                          onClick={() => identityFormFields.remove(index)}
                        />
                      ) : null}
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  <EuiSpacer size="s" />
                </>
              )}
            />
          );
        })}
      </>
    </EuiFormRow>
  );
}
