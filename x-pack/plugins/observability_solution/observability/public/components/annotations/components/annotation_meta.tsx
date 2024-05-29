/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTitle, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { SloSelector } from './slo_selector';
import { Annotation } from '../../../../common/annotations';

export function AnnotationMeta({ editAnnotation }: { editAnnotation?: Annotation | null }) {
  const { control } = useFormContext<Annotation>();

  return (
    <>
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('xpack.observability.annotationForm.euiFormRow.meta', {
            defaultMessage: 'Meta',
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
              onSelected={(slo) => {
                if (slo && 'id' in slo) {
                  field.onChange({ id: slo.id, instanceId: slo.instanceId });
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
