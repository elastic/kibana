/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC, useState, useEffect } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';

import { SelectedModel } from './selected_model';
import { INPUT_TYPE } from './models/inference_base';
import { useTrainedModelsApiService } from '../../../services/ml_api_service/trained_models';

interface Props {
  modelId: string;
  onClose: () => void;
}
export const TestTrainedModelFlyout: FC<Props> = ({ modelId, onClose }) => {
  const trainedModelsApiService = useTrainedModelsApiService();
  const [inputType, setInputType] = useState<INPUT_TYPE>(INPUT_TYPE.TEXT);
  const [model, setModel] = useState<estypes.MlTrainedModelConfig | null>(null);

  useEffect(() => {
    trainedModelsApiService.getTrainedModels(modelId).then((resp) => {
      if (resp.length) {
        setModel(resp[0]);
      }
    });
  }, [modelId, trainedModelsApiService]);

  if (model === null) {
    return null;
  }

  return (
    <>
      <EuiFlyout maxWidth={600} onClose={onClose} data-test-subj="mlTestModelsFlyout">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.ml.trainedModels.testModelsFlyout.headerLabel"
                defaultMessage="Test trained model"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiTitle size="xs">
            <h4>{model.model_id}</h4>
          </EuiTitle>

          <EuiSpacer size="m" />

          <EuiTabs size="s">
            <EuiTab
              isSelected={inputType === INPUT_TYPE.TEXT}
              onClick={() => setInputType(INPUT_TYPE.TEXT)}
            >
              <FormattedMessage
                id="xpack.ml.importExport.exportFlyout.adTab"
                defaultMessage="Text"
              />
            </EuiTab>
            <EuiTab
              isSelected={inputType === INPUT_TYPE.INDEX}
              onClick={() => setInputType(INPUT_TYPE.INDEX)}
            >
              <FormattedMessage
                id="xpack.ml.importExport.exportFlyout.dfaTab"
                defaultMessage="Index"
              />
            </EuiTab>
          </EuiTabs>

          <SelectedModel model={model} inputType={inputType} />
        </EuiFlyoutBody>
      </EuiFlyout>
    </>
  );
};
