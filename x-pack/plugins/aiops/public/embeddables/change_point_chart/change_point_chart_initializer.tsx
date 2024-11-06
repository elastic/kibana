/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiTitle,
} from '@elastic/eui';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { FieldStatsServices } from '@kbn/unified-field-list/src/components/field_stats';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { FieldStatsFlyoutProvider } from '@kbn/ml-field-stats-flyout';
import { useTimefilter } from '@kbn/ml-date-picker';
import { pick } from 'lodash';
import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import {
  ChangePointDetectionContextProvider,
  ChangePointDetectionControlsContextProvider,
  useChangePointDetectionContext,
  useChangePointDetectionControlsContext,
} from '../../components/change_point_detection/change_point_detection_context';
import { DEFAULT_AGG_FUNCTION } from '../../components/change_point_detection/constants';
import { FunctionPicker } from '../../components/change_point_detection/function_picker';
import { MaxSeriesControl } from '../../components/change_point_detection/max_series_control';
import { MetricFieldSelector } from '../../components/change_point_detection/metric_field_selector';
import { PartitionsSelector } from '../../components/change_point_detection/partitions_selector';
import { SplitFieldSelector } from '../../components/change_point_detection/split_field_selector';
import { ViewTypeSelector } from '../../components/change_point_detection/view_type_selector';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useDataSource, DataSourceContextProvider } from '../../hooks/use_data_source';
import { FilterQueryContextProvider } from '../../hooks/use_filters_query';
import { DEFAULT_SERIES } from './const';
import type { ChangePointEmbeddableRuntimeState } from './types';

export interface AnomalyChartsInitializerProps {
  initialInput?: Partial<ChangePointEmbeddableRuntimeState>;
  onCreate: (props: ChangePointEmbeddableRuntimeState) => void;
  onCancel: () => void;
}

export const ChangePointChartInitializer: FC<AnomalyChartsInitializerProps> = ({
  initialInput,
  onCreate,
  onCancel,
}) => {
  const appContextValue = useAiopsAppContext();
  const {
    data: { dataViews },
    unifiedSearch: {
      ui: { IndexPatternSelect },
    },
  } = appContextValue;

  const datePickerDeps: DatePickerDependencies = {
    ...pick(appContextValue, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
    uiSettingsKeys: UI_SETTINGS,
  };

  const [dataViewId, setDataViewId] = useState(initialInput?.dataViewId ?? '');
  const [viewType, setViewType] = useState(initialInput?.viewType ?? 'charts');

  const [formInput, setFormInput] = useState<FormControlsProps>(
    pick(initialInput ?? {}, [
      'fn',
      'metricField',
      'splitField',
      'maxSeriesToPlot',
      'partitions',
    ]) as FormControlsProps
  );

  const [isFormValid, setIsFormValid] = useState(true);

  const updatedProps = useMemo(() => {
    return {
      ...formInput,
      viewType,
      title: isPopulatedObject(formInput)
        ? i18n.translate('xpack.aiops.changePointDetection.attachmentTitle', {
            defaultMessage: 'Change point: {function}({metric}){splitBy}',
            values: {
              function: formInput.fn,
              metric: formInput?.metricField,
              splitBy: formInput?.splitField
                ? i18n.translate('xpack.aiops.changePointDetection.splitByTitle', {
                    defaultMessage: ' split by "{splitField}"',
                    values: { splitField: formInput.splitField },
                  })
                : '',
            },
          })
        : '',
      dataViewId,
    };
  }, [formInput, dataViewId, viewType]);

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 id={'changePointConfig'}>
            <FormattedMessage
              id="xpack.aiops.embeddableChangePointChart.modalTitle"
              defaultMessage="Change point detection configuration"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiForm>
          <ViewTypeSelector value={viewType} onChange={setViewType} />
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.aiops.embeddableChangePointChart.dataViewLabel', {
              defaultMessage: 'Data view',
            })}
          >
            <IndexPatternSelect
              autoFocus={!dataViewId}
              fullWidth
              compressed
              indexPatternId={dataViewId}
              placeholder={i18n.translate(
                'xpack.aiops.embeddableChangePointChart.dataViewSelectorPlaceholder',
                {
                  defaultMessage: 'Select data view',
                }
              )}
              onChange={(newId) => {
                setDataViewId(newId ?? '');
              }}
            />
          </EuiFormRow>
          <EuiHorizontalRule margin={'s'} />
          <DataSourceContextProvider dataViews={dataViews} dataViewId={dataViewId}>
            <DatePickerContextProvider {...datePickerDeps}>
              <FilterQueryContextProvider>
                <ChangePointDetectionContextProvider>
                  <ChangePointDetectionControlsContextProvider>
                    <FormControls
                      formInput={formInput}
                      onChange={setFormInput}
                      onValidationChange={setIsFormValid}
                    />
                  </ChangePointDetectionControlsContextProvider>
                </ChangePointDetectionContextProvider>
              </FilterQueryContextProvider>
            </DatePickerContextProvider>
          </DataSourceContextProvider>
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onCancel}
              data-test-subj="aiopsChangePointChartsInitializerCancelButton"
            >
              <FormattedMessage
                id="xpack.aiops.embeddableChangePointChart.setupModal.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="aiopsChangePointChartsInitializerConfirmButton"
              isDisabled={!isFormValid || !dataViewId}
              onClick={onCreate.bind(null, updatedProps)}
              fill
            >
              <FormattedMessage
                id="xpack.aiops.embeddableChangePointChart.setupModal.confirmButtonLabel"
                defaultMessage="Confirm configurations"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

export type FormControlsProps = Pick<
  ChangePointEmbeddableRuntimeState,
  'metricField' | 'splitField' | 'fn' | 'maxSeriesToPlot' | 'partitions'
>;

export const FormControls: FC<{
  formInput?: FormControlsProps;
  onChange: (update: FormControlsProps) => void;
  onValidationChange: (isValid: boolean) => void;
}> = ({ formInput, onChange, onValidationChange }) => {
  const { charts, data, fieldFormats, theme, uiSettings } = useAiopsAppContext();
  const { dataView } = useDataSource();
  const { combinedQuery } = useChangePointDetectionContext();
  const { metricFieldOptions, splitFieldsOptions } = useChangePointDetectionControlsContext();
  const timefilter = useTimefilter();
  const timefilterActiveBounds = timefilter.getActiveBounds();

  const prevMetricFieldOptions = usePrevious(metricFieldOptions);

  const enableSearch = useMemo<boolean>(() => {
    const field = splitFieldsOptions.find((v) => v.name === formInput?.splitField);
    if (field && field.esTypes) {
      return field.esTypes?.some((t) => t === ES_FIELD_TYPES.KEYWORD);
    } else {
      return false;
    }
  }, [splitFieldsOptions, formInput?.splitField]);

  useEffect(
    function setDefaultOnDataViewChange() {
      if (!isPopulatedObject(formInput)) {
        onChange({
          fn: DEFAULT_AGG_FUNCTION,
          metricField: metricFieldOptions[0]?.name,
          splitField: undefined,
          partitions: undefined,
          maxSeriesToPlot: DEFAULT_SERIES,
        });
        return;
      }

      if (!prevMetricFieldOptions || metricFieldOptions === prevMetricFieldOptions) return;

      onChange({
        fn: formInput.fn,
        metricField: metricFieldOptions[0]?.name,
        splitField: undefined,
        partitions: undefined,
        maxSeriesToPlot: formInput.maxSeriesToPlot,
      });
    },
    [metricFieldOptions, prevMetricFieldOptions, formInput, onChange]
  );

  const updateCallback = useCallback(
    (update: Partial<FormControlsProps>) => {
      onChange({
        ...formInput,
        ...update,
      } as FormControlsProps);
    },
    [formInput, onChange]
  );

  const fieldStatsServices: FieldStatsServices = useMemo(() => {
    return {
      uiSettings,
      dataViews: data.dataViews,
      data,
      fieldFormats,
      charts,
    };
  }, [uiSettings, data, fieldFormats, charts]);

  if (!isPopulatedObject(formInput)) return null;

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
      theme={theme}
    >
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.aiops.embeddableChangePointChart.functionLabel"
            defaultMessage="Function"
          />
        }
      >
        <FunctionPicker value={formInput.fn} onChange={(v) => updateCallback({ fn: v })} />
      </EuiFormRow>

      <MetricFieldSelector
        inline={false}
        value={formInput.metricField}
        onChange={(v) => updateCallback({ metricField: v })}
      />

      <SplitFieldSelector
        inline={false}
        value={formInput.splitField}
        onChange={(v) => updateCallback({ splitField: v })}
      />

      {formInput.splitField ? (
        <PartitionsSelector
          value={formInput.partitions ?? []}
          onChange={(v) => updateCallback({ partitions: v })}
          splitField={formInput.splitField}
          enableSearch={enableSearch}
        />
      ) : null}

      <MaxSeriesControl
        inline={false}
        disabled={!!formInput?.partitions?.length}
        value={formInput.maxSeriesToPlot!}
        onChange={(v) => updateCallback({ maxSeriesToPlot: v })}
        onValidationChange={(result) => onValidationChange(result === null)}
      />
    </FieldStatsFlyoutProvider>
  );
};
