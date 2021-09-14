/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { ResultActions } from './result_actions';
import { ResultHeaderItem } from './result_header_item';
import { ResultMeta, ResultAction } from './types';

import './result_header.scss';

interface Props {
  showScore: boolean;
  isMetaEngine: boolean;
  resultMeta: ResultMeta;
  actions: ResultAction[];
  documentLink?: string;
}

export const ResultHeader: React.FC<Props> = ({
  showScore,
  resultMeta,
  isMetaEngine,
  actions,
  documentLink,
}) => {
  return (
    <header className="appSearchResultHeader">
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        justifyContent="spaceBetween"
        responsive={false}
        wrap
      >
        <EuiFlexItem grow>
          <ResultHeaderItem
            href={documentLink}
            data-test-subj="ResultId"
            field="ID"
            value={resultMeta.id}
            type="id"
          />
        </EuiFlexItem>
        {showScore && (
          <EuiFlexItem grow={false}>
            <ResultHeaderItem
              data-test-subj="ResultScore"
              field="Score"
              value={resultMeta.score}
              type="score"
            />
          </EuiFlexItem>
        )}
        {isMetaEngine && (
          <EuiFlexItem grow={false}>
            <ResultHeaderItem
              data-test-subj="ResultEngine"
              field="Engine"
              value={resultMeta.engine}
              type="string"
            />
          </EuiFlexItem>
        )}
        {actions.length > 0 && (
          <EuiFlexItem grow={false}>
            <ResultActions actions={actions} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </header>
  );
};
