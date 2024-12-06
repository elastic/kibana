/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useMemo } from 'react';

import { SUPPORTED_PYTORCH_TASKS } from '@kbn/ml-trained-models-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiSelect, EuiSpacer, EuiTab, EuiTabs, useEuiPaddingSize } from '@elastic/eui';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TrainedModelItem } from '../../../../common/types/trained_models';
import { isNLPModelItem } from '../../../../common/types/trained_models';
import { SelectedModel } from './selected_model';
import { INPUT_TYPE } from './models/inference_base';
import { useTestTrainedModelsContext } from './test_trained_models_context';
import { type InferecePipelineCreationState } from '../create_pipeline_for_model/state';

interface ContentProps {
  model: TrainedModelItem;
  handlePipelineConfigUpdate?: (configUpdate: Partial<InferecePipelineCreationState>) => void;
  externalPipelineConfig?: estypes.IngestPipeline;
}

export const TestTrainedModelContent: FC<ContentProps> = ({
  model,
  handlePipelineConfigUpdate,
  externalPipelineConfig,
}) => {
  const [deploymentId, setDeploymentId] = useState<string>(
    isNLPModelItem(model) ? model.deployment_ids[0] : model.model_id
  );
  const mediumPadding = useEuiPaddingSize('m');

  const [inputType, setInputType] = useState<INPUT_TYPE>(INPUT_TYPE.TEXT);
  const {
    currentContext: { createPipelineFlyoutOpen },
    setCurrentContext,
  } = useTestTrainedModelsContext();

  const onlyShowTab: INPUT_TYPE | undefined = useMemo(() => {
    return (model.type ?? []).includes(SUPPORTED_PYTORCH_TASKS.TEXT_EXPANSION) ||
      createPipelineFlyoutOpen
      ? INPUT_TYPE.INDEX
      : undefined;
  }, [model, createPipelineFlyoutOpen]);
  return (
    <>
      {isNLPModelItem(model) && model.deployment_ids.length > 1 ? (
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
        handlePipelineConfigUpdate={handlePipelineConfigUpdate}
        externalPipelineConfig={externalPipelineConfig}
        setCurrentContext={setCurrentContext}
      />
    </>
  );
};
