/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiButtonGroup, htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RangeInputField } from '../../range_input_field';
import { validateAxisDomain } from './helpers';
import { UnifiedAxisExtentConfig } from './types';

const idPrefix = htmlIdGenerator()();
export function BucketAxisBoundsControl({
  testSubjPrefix,
  extent,
  setExtent,
  dataBounds,
}: {
  testSubjPrefix: string;
  extent: UnifiedAxisExtentConfig;
  setExtent: (newExtent: UnifiedAxisExtentConfig | undefined) => void;
  dataBounds: { min: number; max: number } | undefined;
}) {
  const boundaryError = !validateAxisDomain(extent);
  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.axisExtent.label', {
          defaultMessage: 'Bounds',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.axisExtent.label', {
            defaultMessage: 'Bounds',
          })}
          data-test-subj={`${testSubjPrefix}_axisBounds_groups`}
          name="axisBounds"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}dataBounds`,
              label: i18n.translate('xpack.lens.axisExtent.dataBounds', {
                defaultMessage: 'Data',
              }),
              'data-test-subj': `${testSubjPrefix}_axisExtent_groups_DataBounds'`,
            },
            {
              id: `${idPrefix}custom`,
              label: i18n.translate('xpack.lens.axisExtent.custom', {
                defaultMessage: 'Custom',
              }),
              'data-test-subj': `${testSubjPrefix}_axisExtent_groups_custom'`,
            },
          ]}
          idSelected={`${idPrefix}${extent.mode ?? 'dataBounds'}`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as UnifiedAxisExtentConfig['mode'];
            setExtent({
              ...extent,
              mode: newMode,
              lowerBound: newMode === 'custom' && dataBounds ? dataBounds.min : undefined,
              upperBound: newMode === 'custom' && dataBounds ? dataBounds.max : undefined,
            });
          }}
        />
      </EuiFormRow>
      {extent?.mode === 'custom' && (
        <RangeInputField
          isInvalid={boundaryError}
          label={' '}
          error={
            boundaryError
              ? i18n.translate('xpack.lens.boundaryError', {
                  defaultMessage: 'Lower bound has to be larger than upper bound',
                })
              : undefined
          }
          testSubjLayout={`${testSubjPrefix}_axisExtent_customBounds`}
          testSubjLower={`${testSubjPrefix}_axisExtent_lowerBound`}
          testSubjUpper={`${testSubjPrefix}_axisExtent_upperBound`}
          lowerValue={extent.lowerBound ?? ''}
          onLowerValueChange={(e) => {
            const val = Number(e.target.value);
            const isEmptyValue = e.target.value === '' || Number.isNaN(Number(val));
            setExtent({
              ...extent,
              lowerBound: isEmptyValue ? undefined : val,
            });
          }}
          onLowerValueBlur={() => {
            if (extent.lowerBound === undefined && dataBounds) {
              setExtent({
                ...extent,
                lowerBound: dataBounds.min,
              });
            }
          }}
          upperValue={extent.upperBound ?? ''}
          onUpperValueChange={(e) => {
            const val = Number(e.target.value);
            const isEmptyValue = e.target.value === '' || Number.isNaN(Number(val));
            setExtent({
              ...extent,
              upperBound: isEmptyValue ? undefined : val,
            });
          }}
          onUpperValueBlur={() => {
            if (extent.upperBound === undefined && dataBounds) {
              setExtent({
                ...extent,
                upperBound: dataBounds.max,
              });
            }
          }}
        />
      )}
    </>
  );
}
