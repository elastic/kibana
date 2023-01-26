/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Control, Controller } from 'react-hook-form';
import type { CreateSLOInput } from '@kbn/slo-schema';

export interface Props {
  control: Control<CreateSLOInput>;
}

export function SloEditFormDescription({ control }: Props) {
  const sloNameId = useGeneratedHtmlId({ prefix: 'sloName' });
  const descriptionId = useGeneratedHtmlId({ prefix: 'sloDescription' });

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <EuiFormLabel>
          {i18n.translate('xpack.observability.slos.sloEdit.description.sloName', {
            defaultMessage: 'SLO Name',
          })}
        </EuiFormLabel>

        <Controller
          name="name"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <EuiFieldText
              fullWidth
              id={sloNameId}
              data-test-subj="sloFormNameInput"
              placeholder={i18n.translate(
                'xpack.observability.slos.sloEdit.description.sloNamePlaceholder',
                {
                  defaultMessage: 'Name for the SLO',
                }
              )}
              {...field}
            />
          )}
        />
      </EuiFlexItem>

      <EuiFlexItem grow>
        <EuiFormLabel>
          {i18n.translate('xpack.observability.slos.sloEdit.description.sloDescription', {
            defaultMessage: 'Description',
          })}
        </EuiFormLabel>

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <EuiTextArea
              fullWidth
              id={descriptionId}
              data-test-subj="sloFormDescriptionTextArea"
              placeholder={i18n.translate(
                'xpack.observability.slos.sloEdit.description.sloDescriptionPlaceholder',
                {
                  defaultMessage: 'A short description of the SLO',
                }
              )}
              {...field}
            />
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
