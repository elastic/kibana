/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ECSMappingEditorFieldProps } from '../queries/ecs_mapping_editor_field';

export const PackShardsField = React.memo(({ euiFieldProps }: ECSMappingEditorFieldProps) => {
  const { control } = useForm<{
    shardsArray: Array<Record<string, number>>;
  }>({
    mode: 'all',
    shouldUnregister: true,
    defaultValues: {
      shardsArray: [{ '*': 100 }],
    },
  });
  const { fields } = useFieldArray({
    control,
    name: 'shardsArray',
  });

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.osquery.pack.form.ecsMappingSection.title"
                defaultMessage="Shards"
              />
            </h5>
          </EuiTitle>
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.osquery.pack.form.ecsMappingSection.description"
              defaultMessage="Use the fields to set shards per policy."
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      {fields.map((item, index, array) => (
        <div key={item.id}>
          <input />
          <div>{index}</div>
        </div>
      ))}
    </>
  );
});
