/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiSpacer } from '@elastic/eui';

import { EngineLogic } from '../../../engine';
import { Result } from '../../../result';
import { Result as ResultType, ResultAction } from '../../../result/types';

interface Props {
  result: ResultType;
  actions: ResultAction[];
}

export const CurationResult: React.FC<Props> = ({ result, actions }) => {
  const {
    isMetaEngine,
    engine: { schema },
  } = useValues(EngineLogic);

  return (
    <>
      <Result
        result={result}
        actions={actions}
        isMetaEngine={isMetaEngine}
        schemaForTypeHighlights={schema}
      />
      <EuiSpacer size="m" />
    </>
  );
};
