/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { OverlayStart, ThemeServiceStart } from 'kibana/public';
import type { ModelItem } from './models_list';
import { toMountPoint, wrapWithTheme } from '../../../../../../../src/plugins/kibana_react/public';

interface ForceStopModelConfirmDialogProps {
  model: ModelItem;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ForceStopModelConfirmDialog: FC<ForceStopModelConfirmDialogProps> = ({
  model,
  onConfirm,
  onCancel,
}) => {
  return (
    <EuiConfirmModal
      title={
        <FormattedMessage
          id="xpack.ml.trainedModels.modelsList.forceStopDialog.title"
          defaultMessage="Stop model {modelId}?"
          values={{ modelId: model.model_id }}
        />
      }
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={
        <FormattedMessage
          id="xpack.ml.trainedModels.modelsList.forceStopDialog.cancelText"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.ml.trainedModels.modelsList.forceStopDialog.confirmText"
          defaultMessage="Stop"
        />
      }
      buttonColor="danger"
    >
      <FormattedMessage
        id="xpack.ml.trainedModels.modelsList.forceStopDialog.pipelinesWarning"
        defaultMessage="You can't use these ingest pipelines until you restart the model:"
      />
      <ul>
        {Object.keys(model.pipelines!)
          .sort()
          .map((pipelineName) => {
            return <li key={pipelineName}>{pipelineName}</li>;
          })}
      </ul>
    </EuiConfirmModal>
  );
};

export const getUserConfirmationProvider =
  (overlays: OverlayStart, theme: ThemeServiceStart) => async (forceStopModel: ModelItem) => {
    return new Promise(async (resolve, reject) => {
      try {
        const modalSession = overlays.openModal(
          toMountPoint(
            wrapWithTheme(
              <ForceStopModelConfirmDialog
                model={forceStopModel}
                onCancel={() => {
                  modalSession.close();
                  resolve(false);
                }}
                onConfirm={() => {
                  modalSession.close();
                  resolve(true);
                }}
              />,
              theme.theme$
            )
          )
        );
      } catch (e) {
        resolve(false);
      }
    });
  };
