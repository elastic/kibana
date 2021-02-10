/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ResultHeaderItem } from './result_header_item';
import { ResultMeta } from './types';

import './result_header.scss';

interface Props {
  showScore: boolean;
  resultMeta: ResultMeta;
}

export const ResultHeader: React.FC<Props> = ({ showScore, resultMeta }) => {
  const showEngineLabel: boolean = resultMeta.id !== resultMeta.scopedId;

  return (
    <header className="appSearchResultHeader">
      {showScore && (
        <div className="appSearchResultHeader__column">
          <ResultHeaderItem
            data-test-subj="ResultScore"
            field="score"
            value={resultMeta.score}
            type="score"
          />
        </div>
      )}

      <div className="appSearchResultHeader__column">
        {showEngineLabel && (
          <ResultHeaderItem
            data-test-subj="ResultEngine"
            field="engine"
            value={resultMeta.engine}
            type="string"
          />
        )}
        <ResultHeaderItem data-test-subj="ResultId" field="id" value={resultMeta.id} type="id" />
      </div>
    </header>
  );
};
