/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiForm,
  EuiButtonGroup,
  EuiFormRow,
  EuiFieldNumber,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import type { Observable } from 'rxjs';
import type { CoreTheme, OverlayStart } from '@kbn/core/public';

interface StartDeploymentSetup {
  config: ThreadingParams;
  onConfigChange: (config: ThreadingParams) => void;
}

export interface ThreadingParams {
  numOfAllocations: number;
  threadsPerAllocations: number;
}

const THREADS_MAX_EXPONENT = 6;

/**
 * Form for setting threading params.
 */
export const StartDeploymentSetup: FC<StartDeploymentSetup> = ({ config, onConfigChange }) => {
  const numOfAllocation = config.numOfAllocations;
  const threadsPerAllocations = config.threadsPerAllocations;

  const threadsPerAllocationsOptions = useMemo(
    () =>
      new Array(THREADS_MAX_EXPONENT).fill(null).map((v, i) => {
        const value = Math.pow(2, i);
        const id = value.toString();

        return {
          id,
          label: id,
          value,
        };
      }),
    []
  );

  const toggleIdSelected = threadsPerAllocationsOptions.find(
    (v) => v.value === threadsPerAllocations
  )!.id;

  return (
    <EuiForm component={'form'} id={'startDeploymentForm'}>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.numbersOfAllocationsLabel"
            defaultMessage="Number of allocations"
          />
        }
        hasChildLabel={false}
        helpText={
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.numbersOfAllocationsHelp"
            defaultMessage="Each allocation means the model gets another thread for executing parallel inference requests"
          />
        }
      >
        <EuiFieldNumber
          min={1}
          name={'numOfAllocations'}
          value={numOfAllocation}
          onChange={(event) => {
            onConfigChange({ ...config, numOfAllocations: Number(event.target.value) });
          }}
        />
      </EuiFormRow>

      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.threadsPerAllocationLabel"
            defaultMessage="Threads per allocation"
          />
        }
        hasChildLabel={false}
        helpText={
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.threadsPerAllocationHelp"
            defaultMessage="Each allocation is may be using a number of threads to parallelize each individual inference request"
          />
        }
      >
        <EuiButtonGroup
          legend={i18n.translate(
            'xpack.ml.trainedModels.modelsList.startDeployment.threadsPerAllocationLegend',
            {
              defaultMessage: 'Threads per allocation selector',
            }
          )}
          name={'threadsPerAllocation'}
          idSelected={toggleIdSelected}
          onChange={(optionId) => {
            const value = threadsPerAllocationsOptions.find((v) => v.id === optionId)!.value;
            onConfigChange({ ...config, threadsPerAllocations: value });
          }}
          options={threadsPerAllocationsOptions}
        />
      </EuiFormRow>
    </EuiForm>
  );
};

interface StartDeploymentModalProps {
  modelId: string;
  onConfigChange: (config: ThreadingParams) => void;
  onClose: () => void;
}

/**
 * Modal window wrapper for {@link StartDeploymentSetup}
 *
 * @param onConfigChange
 * @param onClose
 */
export const StartDeploymentModal: FC<StartDeploymentModalProps> = ({
  modelId,
  onConfigChange,
  onClose,
}) => {
  const [config, setConfig] = useState<ThreadingParams>({
    numOfAllocations: 1,
    threadsPerAllocations: 1,
  });

  return (
    <EuiModal onClose={onClose} initialFocus="[name=numOfAllocations]">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h2>
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.modalTitle"
              defaultMessage="Start {modelId} deployment"
              values={{ modelId }}
            />
          </h2>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <StartDeploymentSetup config={config} onConfigChange={setConfig} />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          type="submit"
          form={'startDeploymentForm'}
          onClick={onConfigChange.bind(null, config)}
          fill
        >
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.startButton"
            defaultMessage="Start"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

/**
 * Returns a callback for requesting user's input for threading params
 * with a form rendered in a modal window.
 *
 * @param overlays
 * @param theme$
 */
export const getUserInputThreadingParamsProvider =
  (overlays: OverlayStart, theme$: Observable<CoreTheme>) =>
  (modelId: string): Promise<ThreadingParams | void> => {
    return new Promise(async (resolve, reject) => {
      try {
        const modalSession = overlays.openModal(
          toMountPoint(
            wrapWithTheme(
              <StartDeploymentModal
                modelId={modelId}
                onConfigChange={(config) => {
                  modalSession.close();
                  resolve(config);
                }}
                onClose={() => {
                  modalSession.close();
                  reject();
                }}
              />,
              theme$
            )
          )
        );
      } catch (e) {
        reject();
      }
    });
  };
