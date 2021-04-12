/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { ENGINE_DOCUMENT_DETAIL_PATH } from '../../routes';
import { generateEncodedPath } from '../../utils/encode_path_params';

import { ResultHeaderItem } from './result_header_item';
import { ResultMeta } from './types';

import './result_header.scss';

interface Props {
  showScore: boolean;
  isMetaEngine: boolean;
  resultMeta: ResultMeta;
  actions?: React.ReactNode;
  shouldLinkToDetailPage?: boolean;
}

export const ResultHeader: React.FC<Props> = ({
  showScore,
  resultMeta,
  isMetaEngine,
  actions,
  shouldLinkToDetailPage = false,
}) => {
  const documentLink = generateEncodedPath(ENGINE_DOCUMENT_DETAIL_PATH, {
    engineName: resultMeta.engine,
    documentId: resultMeta.id,
  });

  return (
    <header style={{ margin: '0 0 .75rem 0' }}>
      <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="spaceBetween">
        <EuiFlexItem grow>
          <ResultHeaderItem
            href={shouldLinkToDetailPage ? documentLink : undefined}
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
        {actions}
      </EuiFlexGroup>
    </header>
  );
};
