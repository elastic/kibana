/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC } from 'react';

import { NerModel } from './models/ner';
import { LangIdentModel } from './models/lang_ident';

interface Props {
  model: estypes.MlTrainedModelConfig | null;
}

export const SelectedModel: FC<Props> = ({ model }) => {
  if (model === null) {
    return null;
  }

  if (model.model_type === 'pytorch') {
    return <NerModel model={model} />;
  }
  if (model.model_type === 'lang_ident') {
    return <LangIdentModel model={model} />;
  }

  return <></>;
};
