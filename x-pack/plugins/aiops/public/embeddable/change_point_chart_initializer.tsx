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
  EuiFieldNumber,
  EuiFieldText,
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
import { SplitFieldSelector } from '../components/change_point_detection/split_field_selector';
import { MetricFieldSelector } from '../components/change_point_detection/metric_field_selector';
import { ChangePointDetectionControlsContextProvider } from '../components/change_point_detection/change_point_detection_context';
import { useAiopsAppContext } from '../hooks/use_aiops_app_context';
import { EmbeddableChangePointChartInput } from './embeddable_change_point_chart';
import { FunctionPicker } from '../components/change_point_detection/function_picker';
import { DataSourceContextProvider } from '../hooks/use_data_source';

export const MAX_ANOMALY_CHARTS_ALLOWED = 50;

export const DEFAULT_MAX_SERIES_TO_PLOT = 6;

export interface AnomalyChartsInitializerProps {
  defaultTitle: string;
  initialInput?: Partial<EmbeddableChangePointChartInput>;
  onCreate: (props: { panelTitle: string; maxSeriesToPlot?: number }) => void;
  onCancel: () => void;
}

export const ChangePointChartInitializer: FC<AnomalyChartsInitializerProps> = ({
  defaultTitle,
  initialInput,
  onCreate,
  onCancel,
  children,
}) => {
  const {
    unifiedSearch: {
      ui: { IndexPatternSelect },
    },
  } = useAiopsAppContext();

  const [panelTitle, setPanelTitle] = useState(defaultTitle);
  const [dataViewId, setDataViewId] = useState(initialInput?.dataViewId ?? '');
  const [maxSeriesToPlot, setMaxSeriesToPlot] = useState(
    initialInput?.maxSeriesToPlot ?? DEFAULT_MAX_SERIES_TO_PLOT
  );

  const [fn, setFn] = useState<string>(initialInput?.fn ?? 'avg');
  const [metricField, setMetricField] = useState(initialInput?.metricField);
  const [splitField, setSplitField] = useState(initialInput?.splitField);

  const isPanelTitleValid = panelTitle.length > 0;
  const isMaxSeriesToPlotValid =
    maxSeriesToPlot >= 1 && maxSeriesToPlot <= MAX_ANOMALY_CHARTS_ALLOWED;
  const isFormValid = isPanelTitleValid && isMaxSeriesToPlotValid;

  return (
    <EuiModal
      initialFocus="[name=panelTitle]"
      onClose={onCancel}
      data-test-subj={'aiopsChangePointChartEmbeddableInitializer'}
    >
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
                    id="xpack.aiops.embeddableChangePointChart.panelTitleLabel"
                    defaultMessage="Panel title"
                  />
                }
                isInvalid={!isPanelTitleValid}
              >
                <EuiFieldText
                  data-test-subj="panelTitleInput"
                  id="panelTitle"
                  name="panelTitle"
                  value={panelTitle}
                  onChange={(e) => setPanelTitle(e.target.value)}
                  isInvalid={!isPanelTitleValid}
                  fullWidth
                />
              </EuiFormRow>

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

              <EuiFormRow
                isInvalid={!isMaxSeriesToPlotValid}
                error={
                  !isMaxSeriesToPlotValid ? (
                    <FormattedMessage
                      id="xpack.aiops.embeddableChangePointChart.maxSeriesToPlotError"
                      defaultMessage="Maximum number of series to plot must be between 1 and 50."
                    />
                  ) : undefined
                }
                label={
                  <FormattedMessage
                    id="xpack.aiops.embeddableChangePointChart.maxSeriesToPlotLabel"
                    defaultMessage="Maximum number of series to plot"
                  />
                }
              >
                <EuiFieldNumber
                  data-test-subj="mlAnomalyChartsInitializerMaxSeries"
                  id="selectMaxSeriesToPlot"
                  name="selectMaxSeriesToPlot"
                  value={maxSeriesToPlot}
                  onChange={(e) => setMaxSeriesToPlot(parseInt(e.target.value, 10))}
                  min={1}
                  max={MAX_ANOMALY_CHARTS_ALLOWED}
                />
              </EuiFormRow>
            </ChangePointDetectionControlsContextProvider>
          </DataSourceContextProvider>
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="mlAnomalyChartsInitializerCancelButton">
          <FormattedMessage
            id="xpack.aiops.embeddableChangePointChart.setupModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="mlAnomalyChartsInitializerConfirmButton"
          isDisabled={!isFormValid}
          onClick={onCreate.bind(null, {
            panelTitle,
            maxSeriesToPlot,
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
