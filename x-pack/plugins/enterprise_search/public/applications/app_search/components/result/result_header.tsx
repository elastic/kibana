/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ResultHeaderItem } from './result_header_item';
import { ResultMeta } from './types';

import './result_header.scss';

interface Props {
  showScore: boolean;
  isMetaEngine: boolean;
  resultMeta: ResultMeta;
}

export const ResultHeader: React.FC<Props> = ({ showScore, resultMeta, isMetaEngine }) => {
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
        {isMetaEngine && (
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
