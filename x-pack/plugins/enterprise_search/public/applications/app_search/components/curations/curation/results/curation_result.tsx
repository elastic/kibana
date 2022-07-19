/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd';

import { useValues } from 'kea';

import type { SearchResult } from '@elastic/search-ui';

import { EngineLogic } from '../../../engine';
import { Result } from '../../../result';
import { ResultAction } from '../../../result/types';

interface Props {
  actions: ResultAction[];
  dragHandleProps?: DraggableProvidedDragHandleProps;
  result: SearchResult;
  index?: number;
}

export const CurationResult: React.FC<Props> = ({ actions, dragHandleProps, result, index }) => {
  const {
    isMetaEngine,
    engine: { schema },
  } = useValues(EngineLogic);

  return (
    <Result
      result={result}
      actions={actions}
      isMetaEngine={isMetaEngine}
      schemaForTypeHighlights={schema}
      dragHandleProps={dragHandleProps}
      resultPosition={typeof index === 'undefined' ? undefined : index + 1}
    />
  );
};
