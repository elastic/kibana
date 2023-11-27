/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useMemo } from 'react';

import { SUPPORTED_PYTORCH_TASKS } from '@kbn/ml-trained-models-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiSelect, EuiSpacer, EuiTab, EuiTabs, useEuiPaddingSize } from '@elastic/eui';
import { SelectedModel } from './selected_model';
import { type ModelItem } from '../models_list';
import { INPUT_TYPE } from './models/inference_base';
import { useTestTrainedModelsContext } from './test_trained_models_context';

interface ContentProps {
  model: ModelItem;
}

export const TestTrainedModelContent: FC<ContentProps> = ({ model }) => {
  const [deploymentId, setDeploymentId] = useState<string>(model.deployment_ids[0]);
  const mediumPadding = useEuiPaddingSize('m');

  const [inputType, setInputType] = useState<INPUT_TYPE>(INPUT_TYPE.TEXT);
  const testTrainedModelsContext = useTestTrainedModelsContext();
  const isCreateMode = testTrainedModelsContext?.currentContext.createPipelineFlyoutOpen;

  const onlyShowTab: INPUT_TYPE | undefined = useMemo(() => {
    return (model.type ?? []).includes(SUPPORTED_PYTORCH_TASKS.TEXT_EXPANSION) || isCreateMode
      ? INPUT_TYPE.INDEX
      : undefined;
  }, [model, isCreateMode]);
  return (
    <>
      {' '}
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
      {onlyShowTab === undefined ? (
        <>
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
        </>
      ) : null}
      <SelectedModel
        model={model}
        inputType={onlyShowTab ?? inputType}
        deploymentId={deploymentId ?? model.model_id}
      />
    </>
  );
};
