/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useState, useMemo, useCallback } from 'react';
import {
  EuiCallOut,
  EuiCheckboxGroup,
  EuiCheckboxGroupOption,
  EuiConfirmModal,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { isDefined } from '@kbn/ml-is-defined';
import type { ModelItem } from './models_list';

interface ForceStopModelConfirmDialogProps {
  model: ModelItem;
  onCancel: () => void;
  onConfirm: (deploymentIds: string[]) => void;
}

/**
 * Confirmation is required when there are multiple model deployments
 * or associated pipelines.
 */
export const StopModelDeploymentsConfirmDialog: FC<ForceStopModelConfirmDialogProps> = ({
  model,
  onConfirm,
  onCancel,
}) => {
  const [checkboxIdToSelectedMap, setCheckboxIdToSelectedMap] = useState<Record<string, boolean>>(
    {}
  );

  const options: EuiCheckboxGroupOption[] = useMemo(
    () =>
      model.deployment_ids.map((deploymentId) => {
        return {
          id: deploymentId,
          label: deploymentId,
        };
      }),
    [model.deployment_ids]
  );

  const onChange = useCallback((id: string) => {
    setCheckboxIdToSelectedMap((prev) => {
      return {
        ...prev,
        [id]: !prev[id],
      };
    });
  }, []);

  const selectedDeploymentIds = useMemo(
    () =>
      model.deployment_ids.length > 1
        ? Object.keys(checkboxIdToSelectedMap).filter((id) => checkboxIdToSelectedMap[id])
        : model.deployment_ids,
    [model.deployment_ids, checkboxIdToSelectedMap]
  );

  const deploymentPipelinesMap = useMemo(() => {
    if (!isPopulatedObject(model.pipelines)) return {};
    return Object.entries(model.pipelines).reduce((acc, [pipelineId, pipelineDef]) => {
      const deploymentIds: string[] = (pipelineDef?.processors ?? [])
        .map((v) => v?.inference?.model_id)
        .filter(isDefined);
      deploymentIds.forEach((dId) => {
        if (acc[dId]) {
          acc[dId].push(pipelineId);
        } else {
          acc[dId] = [pipelineId];
        }
      });
      return acc;
    }, {} as Record<string, string[]>);
  }, [model.pipelines]);

  const pipelineWarning = useMemo<string[]>(() => {
    if (model.deployment_ids.length === 1 && isPopulatedObject(model.pipelines)) {
      return Object.keys(model.pipelines);
    }
    return [
      ...new Set(
        Object.entries(deploymentPipelinesMap)
          .filter(([deploymentId]) => selectedDeploymentIds.includes(deploymentId))
          .flatMap(([, pipelineNames]) => pipelineNames)
      ),
    ].sort();
  }, [model, deploymentPipelinesMap, selectedDeploymentIds]);

  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.ml.trainedModels.modelsList.forceStopDialog.title', {
        defaultMessage:
          'Stop {deploymentCount, plural, one {deployment} other {deployments}} of model {modelId}?',
        values: { modelId: model.model_id, deploymentCount: model.deployment_ids.length },
      })}
      onCancel={onCancel}
      onConfirm={onConfirm.bind(null, selectedDeploymentIds)}
      cancelButtonText={i18n.translate(
        'xpack.ml.trainedModels.modelsList.forceStopDialog.cancelText',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.ml.trainedModels.modelsList.forceStopDialog.confirmText',
        { defaultMessage: 'Stop' }
      )}
      buttonColor="danger"
      confirmButtonDisabled={model.deployment_ids.length > 1 && selectedDeploymentIds.length === 0}
    >
      {model.deployment_ids.length > 1 ? (
        <>
          <EuiCheckboxGroup
            legend={{
              display: 'visible',
              children: (
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.forceStopDialog.selectDeploymentsLegend"
                  defaultMessage="Select deployments to stop"
                />
              ),
            }}
            options={options}
            idToSelectedMap={checkboxIdToSelectedMap}
            onChange={onChange}
          />
          <EuiSpacer size={'m'} />
        </>
      ) : null}

      {pipelineWarning.length > 0 ? (
        <>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.forceStopDialog.pipelinesWarning"
                defaultMessage="You won't be able to use these ingest pipelines until you restart the model:"
              />
            }
            color="warning"
            iconType="warning"
          >
            <p>
              <ul>
                {pipelineWarning.map((pipelineName) => {
                  return <li key={pipelineName}>{pipelineName}</li>;
                })}
              </ul>
            </p>
          </EuiCallOut>
        </>
      ) : null}
    </EuiConfirmModal>
  );
};

export const getUserConfirmationProvider =
  (overlays: OverlayStart, theme: ThemeServiceStart) =>
  async (forceStopModel: ModelItem): Promise<string[]> => {
    return new Promise(async (resolve, reject) => {
      try {
        const modalSession = overlays.openModal(
          toMountPoint(
            wrapWithTheme(
              <StopModelDeploymentsConfirmDialog
                model={forceStopModel}
                onCancel={() => {
                  modalSession.close();
                  reject();
                }}
                onConfirm={(deploymentIds: string[]) => {
                  modalSession.close();
                  resolve(deploymentIds);
                }}
              />,
              theme.theme$
            )
          )
        );
      } catch (e) {
        reject();
      }
    });
  };
