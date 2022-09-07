/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { SearchResult } from '@elastic/search-ui';

import { Schema } from '../../../../../shared/schema/types';
import { Result } from '../../../result/result';

export interface Props {
  result: SearchResult;
  schemaForTypeHighlights?: Schema;
  isMetaEngine: boolean;
}

export const ResultView: React.FC<Props> = ({ result, schemaForTypeHighlights, isMetaEngine }) => {
  return (
    <li>
      <Result
        result={result}
        shouldLinkToDetailPage
        schemaForTypeHighlights={schemaForTypeHighlights}
        isMetaEngine={isMetaEngine}
      />
    </li>
  );
};
