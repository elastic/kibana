/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ChangePointsTable } from './change_points_table';
import { SPLIT_FIELD_CARDINALITY_LIMIT } from './constants';
import { FunctionPicker } from './function_picker';
import { MetricFieldSelector } from './metric_field_selector';
import { SplitFieldSelector } from './split_field_selector';
import { type FieldConfig, useChangePointDetectionContext } from './change_point_detection_context';
import { useChangePointResults } from './use_change_point_agg_request';
import { useSplitFieldCardinality } from './use_split_field_cardinality';

const selectControlCss = { width: '300px' };

export const FieldsConfig: FC = () => {
  const {
    requestParams: { fieldConfigs },
    updateRequestParams,
  } = useChangePointDetectionContext();

  const onChange = useCallback(
    (update: FieldConfig, index: number) => {
      fieldConfigs.splice(index, 1, update);
      updateRequestParams({ fieldConfigs });
    },
    [updateRequestParams, fieldConfigs]
  );

  const onAdd = useCallback(() => {
    const update = [...fieldConfigs];
    update.push(update[update.length - 1]);
    updateRequestParams({ fieldConfigs: update });
  }, [updateRequestParams, fieldConfigs]);

  const onRemove = useCallback(
    (index: number) => {
      fieldConfigs.splice(index, 1);
      updateRequestParams({ fieldConfigs });
    },
    [updateRequestParams, fieldConfigs]
  );

  return (
    <>
      {fieldConfigs.map((fieldConfig, index) => {
        return (
          <React.Fragment key={`${fieldConfig.fn}_${index}`}>
            <EuiPanel paddingSize="s" hasBorder hasShadow={false}>
              <EuiAccordion
                id={'temp_id'}
                buttonElement={'div'}
                buttonContent={
                  <FieldsControls
                    fieldConfig={fieldConfig}
                    onChange={(value) => onChange(value, index)}
                  />
                }
                extraAction={
                  <EuiButtonIcon
                    disabled={fieldConfigs.length === 1}
                    aria-label="trash"
                    iconType="trash"
                    color="danger"
                    onClick={onRemove.bind(null, index)}
                  />
                }
                paddingSize="s"
              >
                <ChangePointResults fieldConfig={fieldConfig} />
              </EuiAccordion>
            </EuiPanel>
            <EuiSpacer size="s" />
          </React.Fragment>
        );
      })}
      <EuiButton onClick={onAdd}>Add</EuiButton>
    </>
  );
};

interface FieldsControlsProps {
  fieldConfig: FieldConfig;
  onChange: (update: FieldConfig) => void;
}

/**
 * Renders controls for fields selection and emits updates on change.
 * @param fieldConfig
 * @param onChange
 * @constructor
 */
export const FieldsControls: FC<FieldsControlsProps> = ({ fieldConfig, onChange }) => {
  const { splitFieldsOptions } = useChangePointDetectionContext();

  const onChangeFn = useCallback(
    (field: keyof FieldConfig, value: string) => {
      const result = { ...fieldConfig, [field]: value };
      onChange(result);
    },
    [onChange, fieldConfig]
  );

  return (
    <EuiFlexGroup alignItems={'center'}>
      <EuiFlexItem grow={false} css={{ width: '200px' }}>
        <FunctionPicker value={fieldConfig.fn} onChange={(v) => onChangeFn('fn', v)} />
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={selectControlCss}>
        <MetricFieldSelector
          value={fieldConfig.metricField!}
          onChange={(v) => onChangeFn('metricField', v)}
        />
      </EuiFlexItem>
      {splitFieldsOptions.length > 0 ? (
        <EuiFlexItem grow={false} css={selectControlCss}>
          <SplitFieldSelector
            value={fieldConfig.splitField}
            onChange={(v) => onChangeFn('splitField', v!)}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

/**
 * Handles request and rendering results of the change point  with provided config.
 */
export const ChangePointResults: FC<{ fieldConfig: FieldConfig }> = ({ fieldConfig }) => {
  const { combinedQuery, requestParams } = useChangePointDetectionContext();

  const splitFieldCardinality = useSplitFieldCardinality(fieldConfig.splitField, combinedQuery);

  const {
    results: annotations,
    isLoading: annotationsLoading,
    progress,
  } = useChangePointResults(fieldConfig, requestParams, combinedQuery, splitFieldCardinality);

  const cardinalityExceeded =
    splitFieldCardinality && splitFieldCardinality > SPLIT_FIELD_CARDINALITY_LIMIT;

  return (
    <>
      <EuiFlexGroup alignItems={'center'}>
        <EuiFlexItem css={{ visibility: progress === 100 ? 'hidden' : 'visible' }} grow={false}>
          <EuiProgress
            label={
              <FormattedMessage
                id="xpack.aiops.changePointDetection.progressBarLabel"
                defaultMessage="Fetching change points"
              />
            }
            value={progress}
            max={100}
            valueText
            size="m"
          />
          <EuiSpacer size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {cardinalityExceeded ? (
        <>
          <EuiCallOut
            title={i18n.translate('xpack.aiops.changePointDetection.cardinalityWarningTitle', {
              defaultMessage: 'Analysis has been limited',
            })}
            color="warning"
            iconType="warning"
          >
            <p>
              {i18n.translate('xpack.aiops.changePointDetection.cardinalityWarningMessage', {
                defaultMessage:
                  'The "{splitField}" field cardinality is {cardinality} which exceeds the limit of {cardinalityLimit}. Only the first {cardinalityLimit} partitions, sorted by document count, are analyzed.',
                values: {
                  cardinality: splitFieldCardinality,
                  cardinalityLimit: SPLIT_FIELD_CARDINALITY_LIMIT,
                  splitField: fieldConfig.splitField,
                },
              })}
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      ) : null}

      {!annotationsLoading && annotations.length === 0 && progress === 100 ? (
        <>
          <EuiEmptyPrompt
            iconType="search"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.aiops.changePointDetection.noChangePointsFoundTitle"
                  defaultMessage="No change points found"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.aiops.changePointDetection.noChangePointsFoundMessage"
                  defaultMessage="Detect statistically significant change points such as dips, spikes, and distribution changes in a metric. Select a metric and set a time range to start detecting change points in your data."
                />
              </p>
            }
          />
        </>
      ) : null}

      <ChangePointsTable annotations={annotations} fieldConfig={fieldConfig} />
    </>
  );
};
