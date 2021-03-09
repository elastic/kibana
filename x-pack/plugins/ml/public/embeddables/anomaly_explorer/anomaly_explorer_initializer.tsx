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
import { FormattedMessage } from '@kbn/i18n/react';
import { AnomalyExplorerEmbeddableInput } from '..';

const MAX_SERIES_ALLOWED = 48;
export interface AnomalyExplorerInitializerProps {
  defaultTitle: string;
  initialInput?: Partial<Pick<AnomalyExplorerEmbeddableInput, 'jobIds' | 'maxSeriesToPlot'>>;
  onCreate: (swimlaneProps: { panelTitle: string; maxSeriesToPlot?: number }) => void;
  onCancel: () => void;
}

export const AnomalyExplorerInitializer: FC<AnomalyExplorerInitializerProps> = ({
  defaultTitle,
  onCreate,
  onCancel,
}) => {
  const [panelTitle, setPanelTitle] = useState(defaultTitle);
  const [maxSeriesToPlot, setMaxSeriesToPlot] = useState(6);

  const isPanelTitleValid = panelTitle.length > 0;

  const isFormValid = isPanelTitleValid && maxSeriesToPlot > 0;
  return (
    <EuiModal initialFocus="[name=panelTitle]" onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.ml.swimlaneEmbeddable.setupModal.title"
            defaultMessage="Anomaly explorer configuration"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.swimlaneEmbeddable.panelTitleLabel"
                defaultMessage="Panel title"
              />
            }
            isInvalid={!isPanelTitleValid}
          >
            <EuiFieldText
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
                id="xpack.ml.explorer.maxSeriesToPlotLabel"
                defaultMessage="Max series to plot"
              />
            }
          >
            <EuiFieldNumber
              id="selectMaxSeriesToPlot"
              name="selectMaxSeriesToPlot"
              value={maxSeriesToPlot}
              onChange={(e) => setMaxSeriesToPlot(parseInt(e.target.value, 10))}
              min={0}
              max={MAX_SERIES_ALLOWED}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>
          <FormattedMessage
            id="xpack.ml.swimlaneEmbeddable.setupModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          isDisabled={!isFormValid}
          onClick={onCreate.bind(null, {
            panelTitle,
            maxSeriesToPlot,
          })}
          fill
        >
          <FormattedMessage
            id="xpack.ml.swimlaneEmbeddable.setupModal.confirmButtonLabel"
            defaultMessage="Confirm"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
