/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState, useCallback } from 'react';

import {
  // EuiButton,
  // EuiFlexGroup,
  // EuiFlexItem,
  EuiSpacer,
  // EuiProgress,
  // EuiSteps,
  // EuiIcon,
  // EuiLoadingSpinner,
  // EuiFormRow,
  // EuiCallOut,
  // EuiSuperSelect,
  // EuiText,
  EuiTitle,
  useEuiTheme,
  EuiHorizontalRule,
} from '@elastic/eui';

import { useMlKibana } from '../../../contexts/kibana';
import { HuggingFaceTrainedModel } from '../../../../../common/types/trained_models';
import { SUPPORTED_PYTORCH_TASKS } from '../../../../../common/constants/trained_models';
import { Model } from './model';

interface Props {
  refreshModels: () => void;
}
export const HuggingFaceModelList: FC<Props> = ({ refreshModels }) => {
  const {
    services: {
      mlServices: {
        mlApiServices: {
          trainedModels: { getHuggingFaceTrainedModels, getTrainedModels },
        },
      },
    },
  } = useMlKibana();
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  // const [huggingFaceModels, setHuggingFaceModels] = useState<HuggingFaceTrainedModel[]>([]);
  const [huggingFaceModelsByType, setHuggingFaceModelsByType] = useState<
    Record<string, HuggingFaceTrainedModel[]>
  >({});
  const [existingTrainedModelsIds, setExistingTrainedModelsIds] = useState<Record<string, null>>(
    {}
  );
  const [taskTypes, setTaskTypes] = useState<string[]>([]);
  const [visibleTaskTypes, setVisibleTaskTypes] = useState<string[]>([]);

  const loadModels = useCallback(() => {
    getHuggingFaceTrainedModels().then((resp) => {
      if (resp.models !== undefined) {
        // setHuggingFaceModels(resp.models);
        const allTaskTypes = [...new Set(resp.models.map((m) => m.task_type))].sort((a, b) =>
          a.localeCompare(b)
        );
        setTaskTypes(allTaskTypes);
        setVisibleTaskTypes(allTaskTypes);

        const gg = resp.models
          .sort((a, b) => a.model_id.localeCompare(b.model_id))
          .reduce<Record<string, HuggingFaceTrainedModel[]>>((acc, cur) => {
            const type = cur.task_type;
            if (acc[type] === undefined) {
              acc[type] = [];
            }
            acc[type].push(cur);
            return acc;
          }, {});
        setHuggingFaceModelsByType(gg);
      }
    });
    getTrainedModels().then((ms) => {
      setExistingTrainedModelsIds(Object.fromEntries(ms.map((m) => [m.model_id, null])));
    });
  }, [getHuggingFaceTrainedModels, getTrainedModels]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  return (
    <>
      {visibleTaskTypes.map((t) => (
        <>
          <div css={{ backgroundColor: colors.lightShade, padding: '6px', borderRadius: '2px' }}>
            <EuiTitle size="s">
              <h3>{readableTaskType(t)}</h3>
            </EuiTitle>
          </div>
          <EuiSpacer size="m" />
          {huggingFaceModelsByType[t] !== undefined &&
            huggingFaceModelsByType[t].map((m, i) => (
              <div css={{ marginLeft: '8px' }}>
                <Model
                  model={m}
                  installed={existingTrainedModelsIds[m.model_id] !== undefined}
                  hidden={false}
                  refreshModels={refreshModels}
                />
                {i < huggingFaceModelsByType[t].length - 1 ? <EuiHorizontalRule /> : <EuiSpacer />}
              </div>
            ))}
        </>
      ))}
    </>
  );
};

function readableTaskType(taskType: string) {
  switch (taskType) {
    case SUPPORTED_PYTORCH_TASKS.FILL_MASK:
      return 'Fill mask';
    case SUPPORTED_PYTORCH_TASKS.NER:
      return 'Named entity recognition';
    case SUPPORTED_PYTORCH_TASKS.QUESTION_ANSWERING:
      return 'Question answering';
    case SUPPORTED_PYTORCH_TASKS.TEXT_CLASSIFICATION:
      return 'Text classification';
    case SUPPORTED_PYTORCH_TASKS.TEXT_EMBEDDING:
      return 'Text embedding';
    case SUPPORTED_PYTORCH_TASKS.ZERO_SHOT_CLASSIFICATION:
      return 'Zero shot classification';

    default:
      return '';
  }
}
