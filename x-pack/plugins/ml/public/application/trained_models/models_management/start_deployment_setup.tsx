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
  EuiCallOut,
  EuiSpacer,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiTitle,
} from '@elastic/eui';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import type { Observable } from 'rxjs';
import type { CoreTheme, OverlayStart } from '@kbn/core/public';
import { css } from '@emotion/react';
import { numberValidator } from '@kbn/ml-agg-utils';
import { composeValidators, requiredValidator } from '../../../../common/util/validators';

interface StartDeploymentSetup {
  config: ThreadingParams;
  onConfigChange: (config: ThreadingParams) => void;
}

export interface ThreadingParams {
  numOfAllocations: number;
  threadsPerAllocations: number;
}

const THREADS_MAX_EXPONENT = 4;

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
      <EuiDescribedFormGroup
        titleSize={'xxs'}
        title={
          <h3>
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.numbersOfAllocationsLabel"
              defaultMessage="Number of allocations"
            />
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.numbersOfAllocationsHelp"
            defaultMessage="Increase to improve throughput of all requests."
          />
        }
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.numbersOfAllocationsLabel"
              defaultMessage="Number of allocations"
            />
          }
          hasChildLabel={false}
        >
          <EuiFieldNumber
            fullWidth
            min={1}
            step={1}
            name={'numOfAllocations'}
            value={numOfAllocation}
            onChange={(event) => {
              onConfigChange({ ...config, numOfAllocations: Number(event.target.value) });
            }}
            data-test-subj={'mlModelsStartDeploymentModalNumOfAllocations'}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        titleSize={'xxs'}
        title={
          <h3>
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.threadsPerAllocationLabel"
              defaultMessage="Threads per allocation"
            />
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.threadsPerAllocationHelp"
            defaultMessage="Increase to improve latency for each request."
          />
        }
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.threadsPerAllocationLabel"
              defaultMessage="Threads per allocation"
            />
          }
          hasChildLabel={false}
        >
          <EuiButtonGroup
            legend={i18n.translate(
              'xpack.ml.trainedModels.modelsList.startDeployment.threadsPerAllocationLegend',
              {
                defaultMessage: 'Threads per allocation selector',
              }
            )}
            name={'threadsPerAllocation'}
            isFullWidth
            idSelected={toggleIdSelected}
            onChange={(optionId) => {
              const value = threadsPerAllocationsOptions.find((v) => v.id === optionId)!.value;
              onConfigChange({ ...config, threadsPerAllocations: value });
            }}
            options={threadsPerAllocationsOptions}
            data-test-subj={'mlModelsStartDeploymentModalThreadsPerAllocation'}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </EuiForm>
  );
};

interface StartDeploymentModalProps {
  modelId: string;
  startModelDeploymentDocUrl: string;
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
  startModelDeploymentDocUrl,
}) => {
  const [config, setConfig] = useState<ThreadingParams>({
    numOfAllocations: 1,
    threadsPerAllocations: 1,
  });

  const numOfAllocationsValidator = composeValidators(
    requiredValidator(),
    numberValidator({ min: 1, integerOnly: true })
  );

  const errors = numOfAllocationsValidator(config.numOfAllocations);

  return (
    <EuiModal
      onClose={onClose}
      initialFocus="[name=numOfAllocations]"
      maxWidth={false}
      data-test-subj="mlModelsStartDeploymentModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <EuiFlexGroup justifyContent={'spaceBetween'}>
            <EuiFlexItem grow={false}>
              <EuiTitle size={'s'}>
                <h2>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.modelsList.startDeployment.modalTitle"
                    defaultMessage="Start {modelId} deployment"
                    values={{ modelId }}
                  />
                </h2>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false} />
          </EuiFlexGroup>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiCallOut
          size={'s'}
          title={
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.maxNumOfProcessorsWarning"
              defaultMessage="The product of the number of allocations and threads per allocation should be less than the total number of processors on your ML nodes."
            />
          }
          iconType="iInCircle"
          color={'primary'}
        />
        <EuiSpacer size={'m'} />

        <StartDeploymentSetup config={config} onConfigChange={setConfig} />

        <EuiSpacer size={'m'} />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiLink
          href={startModelDeploymentDocUrl}
          external
          target={'_blank'}
          css={css`
            align-self: center;
            margin-right: auto;
          `}
        >
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.docLinkTitle"
            defaultMessage="Learn more"
          />
        </EuiLink>

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
          disabled={!!errors}
          data-test-subj={'mlModelsStartDeploymentModalStartButton'}
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
  (overlays: OverlayStart, theme$: Observable<CoreTheme>, startModelDeploymentDocUrl: string) =>
  (modelId: string): Promise<ThreadingParams | void> => {
    return new Promise(async (resolve, reject) => {
      try {
        const modalSession = overlays.openModal(
          toMountPoint(
            wrapWithTheme(
              <StartDeploymentModal
                startModelDeploymentDocUrl={startModelDeploymentDocUrl}
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
