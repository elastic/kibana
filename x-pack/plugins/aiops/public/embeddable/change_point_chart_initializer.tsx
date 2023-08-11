/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { type EmbeddableChangePointChartExplicitInput } from './types';
import { MaxSeriesControl } from '../components/change_point_detection/max_series_control';
import { SplitFieldSelector } from '../components/change_point_detection/split_field_selector';
import { MetricFieldSelector } from '../components/change_point_detection/metric_field_selector';
import { ChangePointDetectionControlsContextProvider } from '../components/change_point_detection/change_point_detection_context';
import { useAiopsAppContext } from '../hooks/use_aiops_app_context';
import { EmbeddableChangePointChartInput } from './embeddable_change_point_chart';
import { FunctionPicker } from '../components/change_point_detection/function_picker';
import { DataSourceContextProvider } from '../hooks/use_data_source';

export const DEFAULT_MAX_SERIES_TO_PLOT = 6;

export interface AnomalyChartsInitializerProps {
  initialInput?: Partial<EmbeddableChangePointChartInput>;
  onCreate: (props: EmbeddableChangePointChartExplicitInput) => void;
  onCancel: () => void;
}

export const ChangePointChartInitializer: FC<AnomalyChartsInitializerProps> = ({
  initialInput,
  onCreate,
  onCancel,
}) => {
  const {
    unifiedSearch: {
      ui: { IndexPatternSelect },
    },
  } = useAiopsAppContext();

  const [dataViewId, setDataViewId] = useState(initialInput?.dataViewId ?? '');
  const [maxSeriesToPlot, setMaxSeriesToPlot] = useState(
    initialInput?.maxSeriesToPlot ?? DEFAULT_MAX_SERIES_TO_PLOT
  );

  const [isFormValid, setIsFormValid] = useState(false);
  const [fn, setFn] = useState<string>(initialInput?.fn ?? 'avg');
  const [metricField, setMetricField] = useState(initialInput?.metricField);
  const [splitField, setSplitField] = useState(initialInput?.splitField);

  return (
    <EuiModal onClose={onCancel} data-test-subj={'aiopsChangePointChartEmbeddableInitializer'}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.aiops.embeddableChangePointChart.modalTitle"
            defaultMessage="Change point charts configuration"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm>
          <EuiFormRow fullWidth>
            <IndexPatternSelect
              autoFocus
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

          <DataSourceContextProvider dataViewId={dataViewId}>
            <ChangePointDetectionControlsContextProvider>
              <EuiFormRow
                fullWidth
                label={
                  <FormattedMessage
                    id="xpack.aiops.embeddableChangePointChart.functionLabel"
                    defaultMessage="Function"
                  />
                }
              >
                <FunctionPicker value={fn} onChange={setFn} />
              </EuiFormRow>

              <MetricFieldSelector value={metricField!} onChange={setMetricField} />

              <SplitFieldSelector value={splitField} onChange={setSplitField} />

              <MaxSeriesControl
                value={maxSeriesToPlot}
                onChange={setMaxSeriesToPlot}
                onValidationChange={(result) => setIsFormValid(result === null)}
              />
            </ChangePointDetectionControlsContextProvider>
          </DataSourceContextProvider>
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onCancel}
          data-test-subj="aiopsChangePointChartsInitializerCancelButton"
        >
          <FormattedMessage
            id="xpack.aiops.embeddableChangePointChart.setupModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="aiopsChangePointChartsInitializerConfirmButton"
          isDisabled={!isFormValid}
          onClick={onCreate.bind(null, {
            title: i18n.translate('xpack.aiops.changePointDetection.attachmentTitle', {
              defaultMessage: 'Change point: {function}({metric}){splitBy}',
              values: {
                function: fn,
                metric: metricField,
                splitBy: splitField
                  ? i18n.translate('xpack.aiops.changePointDetection.splitByTitle', {
                      defaultMessage: ' split by "{splitField}"',
                      values: { splitField },
                    })
                  : '',
              },
            }),
            maxSeriesToPlot,
            dataViewId,
            fn,
            // @ts-ignore
            metricField,
            splitField,
          })}
          fill
        >
          <FormattedMessage
            id="xpack.aiops.embeddableChangePointChart.setupModal.confirmButtonLabel"
            defaultMessage="Confirm configurations"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
