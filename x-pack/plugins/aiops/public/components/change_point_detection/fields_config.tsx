/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { type FieldStatsServices } from '@kbn/unified-field-list-plugin/public';
import { useTimefilter, useTimeRangeUpdates } from '@kbn/ml-date-picker';
import { useDataSource } from '../../hooks/use_data_source';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { ChangePointsTable } from './change_points_table';
import { MAX_CHANGE_POINT_CONFIGS, SPLIT_FIELD_CARDINALITY_LIMIT } from './constants';
import { FunctionPicker } from './function_picker';
import { MetricFieldSelector } from './metric_field_selector';
import { SplitFieldSelector } from './split_field_selector';
import {
  type ChangePointAnnotation,
  type FieldConfig,
  SelectedChangePoint,
  useChangePointDetectionContext,
} from './change_point_detection_context';
import { useChangePointResults } from './use_change_point_agg_request';
import { useSplitFieldCardinality } from './use_split_field_cardinality';

const selectControlCss = { width: '350px' };

/**
 * Contains panels with controls and change point results.
 */
export const FieldsConfig: FC = () => {
  const {
    requestParams: { fieldConfigs },
    updateRequestParams,
    selectedChangePoints,
    setSelectedChangePoints,
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

      delete selectedChangePoints[index];
      setSelectedChangePoints({
        ...selectedChangePoints,
      });
    },
    [updateRequestParams, fieldConfigs, setSelectedChangePoints, selectedChangePoints]
  );

  const onSelectionChange = useCallback(
    (update: SelectedChangePoint[], index: number) => {
      setSelectedChangePoints({
        ...selectedChangePoints,
        [index]: update,
      });
    },
    [setSelectedChangePoints, selectedChangePoints]
  );

  return (
    <>
      {fieldConfigs.map((fieldConfig, index) => {
        const key = index;
        return (
          <React.Fragment key={key}>
            <FieldPanel
              data-test-subj={`aiopsChangePointPanel_${index}`}
              fieldConfig={fieldConfig}
              onChange={(value) => onChange(value, index)}
              onRemove={onRemove.bind(null, index)}
              removeDisabled={fieldConfigs.length === 1}
              onSelectionChange={(update) => {
                onSelectionChange(update, index);
              }}
            />
            <EuiSpacer size="s" />
          </React.Fragment>
        );
      })}
      <EuiButton
        onClick={onAdd}
        disabled={fieldConfigs.length >= MAX_CHANGE_POINT_CONFIGS}
        data-test-subj={'aiopsChangePointAddConfig'}
      >
        <FormattedMessage
          id="xpack.aiops.changePointDetection.addButtonLabel"
          defaultMessage="Add"
        />
      </EuiButton>
    </>
  );
};

export interface FieldPanelProps {
  fieldConfig: FieldConfig;
  removeDisabled: boolean;
  onChange: (update: FieldConfig) => void;
  onRemove: () => void;
  onSelectionChange: (update: SelectedChangePoint[]) => void;
  'data-test-subj': string;
}

/**
 * Components that combines field config and state for change point response.
 * @param fieldConfig
 * @param onChange
 * @param onRemove
 * @param removeDisabled
 * @constructor
 */
const FieldPanel: FC<FieldPanelProps> = ({
  fieldConfig,
  onChange,
  onRemove,
  removeDisabled,
  onSelectionChange,
  'data-test-subj': dataTestSubj,
}) => {
  const { combinedQuery, requestParams } = useChangePointDetectionContext();

  const splitFieldCardinality = useSplitFieldCardinality(fieldConfig.splitField, combinedQuery);

  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const {
    results: annotations,
    isLoading: annotationsLoading,
    progress,
  } = useChangePointResults(fieldConfig, requestParams, combinedQuery, splitFieldCardinality);

  return (
    <EuiPanel paddingSize="s" hasBorder hasShadow={false} data-test-subj={dataTestSubj}>
      <EuiFlexGroup alignItems={'center'} justifyContent={'spaceBetween'} gutterSize={'s'}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems={'center'} gutterSize={'s'}>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
                onClick={setIsExpanded.bind(null, (prevState) => !prevState)}
                aria-label={i18n.translate('xpack.aiops.changePointDetection.expandConfigLabel', {
                  defaultMessage: 'Expand configuration',
                })}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FieldsControls fieldConfig={fieldConfig} onChange={onChange}>
                <EuiFlexItem
                  css={{ visibility: progress === null ? 'hidden' : 'visible' }}
                  grow={true}
                >
                  <EuiProgress
                    label={
                      <FormattedMessage
                        id="xpack.aiops.changePointDetection.progressBarLabel"
                        defaultMessage="Fetching change points"
                      />
                    }
                    value={progress ?? 0}
                    max={100}
                    valueText
                    size="m"
                  />
                  <EuiSpacer size="s" />
                </EuiFlexItem>
              </FieldsControls>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            disabled={removeDisabled}
            aria-label={i18n.translate('xpack.aiops.changePointDetection.removeConfigLabel', {
              defaultMessage: 'Remove configuration',
            })}
            iconType="trash"
            color="danger"
            onClick={onRemove}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {isExpanded ? (
        <ChangePointResults
          fieldConfig={fieldConfig}
          isLoading={annotationsLoading}
          annotations={annotations}
          splitFieldCardinality={splitFieldCardinality}
          onSelectionChange={onSelectionChange}
        />
      ) : null}
    </EuiPanel>
  );
};

interface FieldsControlsProps {
  fieldConfig: FieldConfig;
  onChange: (update: FieldConfig) => void;
}

/**
 * Renders controls for fields selection and emits updates on change.
 */
export const FieldsControls: FC<FieldsControlsProps> = ({ fieldConfig, onChange, children }) => {
  const { splitFieldsOptions, combinedQuery } = useChangePointDetectionContext();
  const { dataView } = useDataSource();
  const { data, uiSettings, fieldFormats, charts, fieldStats } = useAiopsAppContext();
  const timefilter = useTimefilter();
  // required in order to trigger state updates
  useTimeRangeUpdates();
  const timefilterActiveBounds = timefilter.getActiveBounds();

  const fieldStatsServices: FieldStatsServices = useMemo(() => {
    return {
      uiSettings,
      dataViews: data.dataViews,
      data,
      fieldFormats,
      charts,
    };
  }, [uiSettings, data, fieldFormats, charts]);

  const FieldStatsFlyoutProvider = fieldStats!.FieldStatsFlyoutProvider;

  const onChangeFn = useCallback(
    (field: keyof FieldConfig, value: string) => {
      const result = { ...fieldConfig, [field]: value };
      onChange(result);
    },
    [onChange, fieldConfig]
  );

  return (
    <FieldStatsFlyoutProvider
      fieldStatsServices={fieldStatsServices}
      dataView={dataView}
      dslQuery={combinedQuery}
      timeRangeMs={
        timefilterActiveBounds
          ? {
              from: timefilterActiveBounds.min!.valueOf(),
              to: timefilterActiveBounds.max!.valueOf(),
            }
          : undefined
      }
    >
      <EuiFlexGroup alignItems={'center'} responsive={true} wrap={true} gutterSize={'m'}>
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

        {children}
      </EuiFlexGroup>
    </FieldStatsFlyoutProvider>
  );
};

interface ChangePointResultsProps {
  fieldConfig: FieldConfig;
  splitFieldCardinality: number | null;
  isLoading: boolean;
  annotations: ChangePointAnnotation[];
  onSelectionChange: (update: SelectedChangePoint[]) => void;
}

/**
 * Handles request and rendering results of the change point  with provided config.
 */
export const ChangePointResults: FC<ChangePointResultsProps> = ({
  fieldConfig,
  splitFieldCardinality,
  isLoading,
  annotations,
  onSelectionChange,
}) => {
  const cardinalityExceeded =
    splitFieldCardinality && splitFieldCardinality > SPLIT_FIELD_CARDINALITY_LIMIT;

  return (
    <>
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

      <ChangePointsTable
        annotations={annotations}
        fieldConfig={fieldConfig}
        isLoading={isLoading}
        onSelectionChange={onSelectionChange}
      />
    </>
  );
};
