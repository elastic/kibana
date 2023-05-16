/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  useEuiPaddingSize,
} from '@elastic/eui';

import { SelectedModel } from './selected_model';
import { INPUT_TYPE } from './models/inference_base';
import { type ModelItem } from '../models_list';

interface Props {
  model: ModelItem;
  onClose: () => void;
}
export const TestTrainedModelFlyout: FC<Props> = ({ model, onClose }) => {
  const [deploymentId, setDeploymentId] = useState<string>(model.deployment_ids[0]);
  const mediumPadding = useEuiPaddingSize('m');

  const [inputType, setInputType] = useState<INPUT_TYPE>(INPUT_TYPE.TEXT);

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
          <EuiSpacer size="s" />
          <EuiTitle size="xs">
            <h4>{model.model_id}</h4>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {model.deployment_ids.length > 1 ? (
            <>
              <EuiFormRow
                fullWidth
                label={
                  <FormattedMessage
                    id="xpack.ml.trainedModels.testModelsFlyout.deploymentIdLabel"
                    defaultMessage="Deployment ID"
                  />
                }
              >
                <EuiSelect
                  fullWidth
                  options={model.deployment_ids.map((v) => {
                    return { text: v, value: v };
                  })}
                  value={deploymentId}
                  onChange={(e) => {
                    setDeploymentId(e.target.value);
                  }}
                />
              </EuiFormRow>
              <EuiSpacer size="l" />
            </>
          ) : null}

          <EuiTabs
            size="m"
            css={{
              marginTop: `-${mediumPadding}`,
            }}
          >
            <EuiTab
              isSelected={inputType === INPUT_TYPE.TEXT}
              onClick={() => setInputType(INPUT_TYPE.TEXT)}
            >
              <FormattedMessage
                id="xpack.ml.trainedModels.testModelsFlyout.textTab"
                defaultMessage="Test using text"
              />
            </EuiTab>
            <EuiTab
              isSelected={inputType === INPUT_TYPE.INDEX}
              onClick={() => setInputType(INPUT_TYPE.INDEX)}
            >
              <FormattedMessage
                id="xpack.ml.trainedModels.testModelsFlyout.indexTab"
                defaultMessage="Test using existing index"
              />
            </EuiTab>
          </EuiTabs>

          <EuiSpacer size="m" />

          <SelectedModel
            model={model}
            inputType={inputType}
            deploymentId={deploymentId ?? model.model_id}
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    </>
  );
};
