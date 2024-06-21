/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTitle, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE } from '@kbn/slo-schema';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { SloSelector } from './slo_selector';
import { Annotation } from '../../../../common/annotations';

export function AnnotationApplyTo({ editAnnotation }: { editAnnotation?: Annotation | null }) {
  const { control } = useFormContext<Annotation>();

  return (
    <>
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('xpack.observability.annotationForm.euiFormRow.applyTo', {
            defaultMessage: 'Apply to',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFormRow
        label={i18n.translate('xpack.observability.annotationMeta.euiFormRow.sloLabel', {
          defaultMessage: 'SLO',
        })}
        display="columnCompressed"
        fullWidth={true}
      >
        <Controller
          defaultValue={editAnnotation?.slo}
          name="slo"
          control={control}
          render={({ field }) => (
            <SloSelector
              initialSlos={
                field.value
                  ? [
                      {
                        id: field.value.id!,
                        instanceId: field.value.instanceId!,
                      },
                    ]
                  : []
              }
              onSelected={(newValue) => {
                const { slos, all } = newValue;
                if (all) {
                  field.onChange({
                    id: ALL_VALUE,
                  });
                } else {
                  if (slos && 'id' in slos) {
                    field.onChange({ id: slos.id, instanceId: slos.instanceId });
                  }
                }
              }}
              singleSelection={true}
            />
          )}
        />
      </EuiFormRow>
    </>
  );
}
