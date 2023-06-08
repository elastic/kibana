/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  CreateCompositeSLOInput,
  SLOWithSummaryResponse,
  sloWithSummarySchema,
} from '@kbn/slo-schema';
import React, { useState } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { COMPOSITE_METHOD_OPTIONS } from '../constants';
import { maxWidth } from './composite_slo_form';
import { SourceRow } from './source_row';

interface Props {
  isEditMode: boolean;
}

export function SourcesSection({ isEditMode }: Props) {
  const { control } = useFormContext<CreateCompositeSLOInput>();
  const {
    fields: sources,
    append,
    remove,
  } = useFieldArray({
    control,
    name: 'sources',
  });

  const handleDeleteSource = (index: number) => () => {
    remove(index);
  };

  const handleAddSource = () => {
    append({ id: '', revision: 1, weight: 1 });
  };

  const isAddDisabled = sources?.length >= 30;
  const isDeleteDisabled = sources?.length === 1;

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none" style={{ maxWidth }}>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFormRow
          label={i18n.translate('xpack.observability.slo.compositeSloForm.compositeMethod', {
            defaultMessage: 'Choose the composite method',
          })}
        >
          <Controller
            name="compositeMethod"
            control={control}
            rules={{ required: true }}
            render={({ field: { ref, ...field } }) => (
              <EuiSelect {...field} required options={COMPOSITE_METHOD_OPTIONS} />
            )}
          />
        </EuiFormRow>

        <EuiFlexGroup direction="column" gutterSize="s">
          {sources?.map((source, index) => (
            <SourceRow
              key={source.id}
              index={index}
              isDeleteDisabled={isDeleteDisabled}
              onDeleteSource={handleDeleteSource(index)}
            />
          ))}
        </EuiFlexGroup>

        <EuiFlexGroup direction="row">
          <EuiFlexItem grow={0}>
            <EuiButtonEmpty
              data-test-subj="customMetricIndicatorAddMetricButton"
              color={'primary'}
              size="xs"
              iconType={'plusInCircleFilled'}
              onClick={handleAddSource}
              isDisabled={isAddDisabled}
              aria-label={i18n.translate(
                'xpack.observability.slo.compositeSloForm.source.addLabel',
                {
                  defaultMessage: 'Add source SLO',
                }
              )}
            >
              <FormattedMessage
                id="xpack.observability.slo.compositeSloForm.source.addLabel"
                defaultMessage="Add source SLO"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
