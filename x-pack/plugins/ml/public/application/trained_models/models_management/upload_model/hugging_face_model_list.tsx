/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState, useCallback } from 'react';

// import {
//   EuiButton,
//   EuiFlexGroup,
//   EuiFlexItem,
//   EuiSpacer,
//   EuiProgress,
//   EuiSteps,
//   // EuiIcon,
//   // EuiLoadingSpinner,
//   EuiFormRow,
//   EuiCallOut,
//   EuiSuperSelect,
//   EuiText,
// } from '@elastic/eui';

import './style.scss';

import { useMlKibana } from '../../../contexts/kibana';
import { HuggingFaceTrainedModel } from '../../../../../common/types/trained_models';
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

  const [huggingFaceModels, setHuggingFaceModels] = useState<HuggingFaceTrainedModel[]>([]);
  const [existingTrainedModelsIds, setExistingTrainedModelsIds] = useState<Record<string, null>>(
    {}
  );

  const loadModels = useCallback(() => {
    getHuggingFaceTrainedModels().then((resp) => {
      if (resp.models !== undefined) {
        setHuggingFaceModels(resp.models);
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
      {huggingFaceModels.map((m) => (
        <>
          <Model
            model={m}
            installed={existingTrainedModelsIds[m.model_id] !== undefined}
            hidden={false}
            refreshModels={refreshModels}
          />
        </>
      ))}
    </>
  );
};
