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
import { isCloud } from '../../services/ml_server_info';
import {
  composeValidators,
  numberValidator,
  requiredValidator,
} from '../../../../common/util/validators';

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
    <EuiModal onClose={onClose} initialFocus="[name=numOfAllocations]" maxWidth={false}>
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
        <EuiLink href={startModelDeploymentDocUrl} external target={'_blank'}>
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.docLinkTitle"
            defaultMessage="Learn more"
          />
        </EuiLink>
      </EuiModalHeader>

      <EuiModalBody>
        {isCloud() ? (
          <>
            <EuiCallOut
              size={'s'}
              title={
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.startDeployment.cloudWarningHeader"
                  defaultMessage="In the future Cloud deployments will autoscale to have the required number of processors."
                />
              }
              iconType="iInCircle"
              color={'warning'}
            >
              <p>
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.startDeployment.cloudWarningText"
                  defaultMessage="However, in this release you must increase the size of your ML nodes manually in the Cloud console to get more processors."
                />
              </p>
            </EuiCallOut>
            <EuiSpacer size={'m'} />
          </>
        ) : null}

        <EuiCallOut
          size={'s'}
          title={
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.maxNumOfProcessorsWarning"
              defaultMessage="The sum of the number of allocations and threads per allocation must be less that the total number of processors on your ML nodes."
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
