/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC } from 'react';

import { NerOutput, NerInference } from './models/ner';
import type { FormattedNerResponse } from './models/ner';
import { LangIdentOutput, LangIdentInference } from './models/lang_ident';
import type { FormattedLangIdentResponse } from './models/lang_ident';
import {
  TextClassificationOutput,
  TextClassificationInference,
} from './models/text_classification';
import type { FormattedTextClassificationResponse } from './models/text_classification';

import {
  TRAINED_MODEL_TYPE,
  SUPPORTED_PYTORCH_TASKS,
} from '../../../../../common/constants/trained_models';
import { useMlApiContext } from '../../../contexts/kibana';
import { InferenceInputForm } from './models/inference_input_form';

interface Props {
  model: estypes.MlTrainedModelConfig | null;
}

export const SelectedModel: FC<Props> = ({ model }) => {
  const { trainedModels } = useMlApiContext();

  if (model === null) {
    return null;
  }

  if (model.model_type === TRAINED_MODEL_TYPE.PYTORCH) {
    if (Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.NER) {
      const inferrer = new NerInference(trainedModels, model);
      return (
        <InferenceInputForm
          inferrer={inferrer}
          getOutputComponent={(output: FormattedNerResponse) => <NerOutput result={output} />}
        />
      );
    }

    if (Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.TEXT_CLASSIFICATION) {
      const inferrer = new TextClassificationInference(trainedModels, model);
      return (
        <InferenceInputForm
          inferrer={inferrer}
          getOutputComponent={(output: FormattedTextClassificationResponse) => (
            <TextClassificationOutput result={output} />
          )}
        />
      );
    }
  }
  if (model.model_type === TRAINED_MODEL_TYPE.LANG_IDENT) {
    const inferrer = new LangIdentInference(trainedModels, model);
    return (
      <InferenceInputForm
        inferrer={inferrer}
        getOutputComponent={(output: FormattedLangIdentResponse) => (
          <LangIdentOutput result={output} />
        )}
      />
    );
  }

  return null;
};
