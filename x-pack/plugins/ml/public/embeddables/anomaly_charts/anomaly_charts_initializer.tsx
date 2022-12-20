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
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiFieldNumber,
  EuiFieldText,
  EuiModal,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { AnomalyChartsEmbeddableInput } from '..';
import { DEFAULT_MAX_SERIES_TO_PLOT } from '../../application/services/anomaly_explorer_charts_service';

export const MAX_ANOMALY_CHARTS_ALLOWED = 48;
export interface AnomalyChartsInitializerProps {
  defaultTitle: string;
  initialInput?: Partial<Pick<AnomalyChartsEmbeddableInput, 'jobIds' | 'maxSeriesToPlot'>>;
  onCreate: (props: { panelTitle: string; maxSeriesToPlot?: number }) => void;
  onCancel: () => void;
}

export const AnomalyChartsInitializer: FC<AnomalyChartsInitializerProps> = ({
  defaultTitle,
  initialInput,
  onCreate,
  onCancel,
}) => {
  const [panelTitle, setPanelTitle] = useState(defaultTitle);
  const [maxSeriesToPlot, setMaxSeriesToPlot] = useState(
    initialInput?.maxSeriesToPlot ?? DEFAULT_MAX_SERIES_TO_PLOT
  );

  const isPanelTitleValid = panelTitle.length > 0;

  const isFormValid = isPanelTitleValid && maxSeriesToPlot > 0;
  return (
    <EuiModal
      initialFocus="[name=panelTitle]"
      onClose={onCancel}
      data-test-subj={'mlAnomalyChartsEmbeddableInitializer'}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h2>
            <FormattedMessage
              id="xpack.ml.anomalyChartsEmbeddable.setupModal.title"
              defaultMessage="Anomaly explorer charts configuration"
            />
          </h2>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.anomalyChartsEmbeddable.panelTitleLabel"
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
            />
          </EuiFormRow>

          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.anomalyChartsEmbeddable.maxSeriesToPlotLabel"
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
              min={0}
              max={MAX_ANOMALY_CHARTS_ALLOWED}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="mlAnomalyChartsInitializerCancelButton">
          <FormattedMessage
            id="xpack.ml.anomalyChartsEmbeddable.setupModal.cancelButtonLabel"
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
            id="xpack.ml.anomalyChartsEmbeddable.setupModal.confirmButtonLabel"
            defaultMessage="Confirm configurations"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
