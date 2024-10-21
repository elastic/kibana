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

export function MetadataFieldsInput({ control }: { control: Control<EntityDefinition> }) {
  const metadataFields = useFieldArray({ control, name: 'metadata' });

  return (
    <EuiFormRow
      label="Metadata"
      labelAppend={
        <EuiButtonIcon
          iconType="plus"
          onClick={() =>
            metadataFields.append({
              source: '',
              destination: '',
              aggregation: { type: 'terms', limit: 10 },
            })
          }
        />
      }
    >
      <>
        {metadataFields.fields.map((item, index) => {
          return (
            <Controller
              control={control}
              name={`metadata.${index}.source`}
              render={() => (
                <>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem>
                      <EuiFieldText
                        key={index}
                        value={item.source}
                        placeholder="source"
                        onBlur={() => {
                          if (item.destination.length === 0) {
                            metadataFields.update(index, { ...item, destination: item.source });
                          }
                        }}
                        onChange={(e) => {
                          metadataFields.update(index, { ...item, source: e.target.value });
                        }}
                        fullWidth
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFieldText
                        key={index}
                        value={item.destination}
                        placeholder="destination"
                        onChange={(e) =>
                          metadataFields.update(index, { ...item, destination: e.target.value })
                        }
                        fullWidth
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiButtonIcon
                        iconType="trash"
                        color="danger"
                        onClick={() => metadataFields.remove(index)}
                      />
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
