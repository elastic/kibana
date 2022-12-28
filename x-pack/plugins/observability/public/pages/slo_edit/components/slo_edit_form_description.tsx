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
import type { CreateSLOParamsForFE } from '../../../typings';

interface SloEditFormDescriptionProps {
  control: Control<CreateSLOParamsForFE>;
}

export function SloEditFormDescription({ control }: SloEditFormDescriptionProps) {
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
          name="name"
          control={control}
          render={({ field }) => (
            <EuiTextArea
              fullWidth
              id={descriptionId}
              placeholder={i18n.translate(
                'xpack.observability.slos.sloEdit.description.sloDescriptionPlaceholder',
                {
                  defaultMessage: 'The purpose of SLO, internal or external.',
                }
              )}
            />
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
