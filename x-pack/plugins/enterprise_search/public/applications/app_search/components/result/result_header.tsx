/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

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
  resultPosition?: number;
  showClick: boolean;
}

export const ResultHeader: React.FC<Props> = ({
  showScore,
  resultMeta,
  isMetaEngine,
  actions,
  documentLink,
  resultPosition,
  showClick,
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
        {typeof resultPosition !== 'undefined' && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              <FormattedMessage
                id="xpack.enterpriseSearch.appSearch.result.resultPositionLabel"
                defaultMessage="#{resultPosition}"
                values={{
                  resultPosition,
                }}
              />
            </EuiBadge>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow>
          <ResultHeaderItem
            href={documentLink}
            data-test-subj="ResultId"
            field="ID"
            value={resultMeta.id}
            type="id"
          />
        </EuiFlexItem>
        {showClick && (
          <EuiFlexItem grow={false}>
            <ResultHeaderItem
              data-test-subj="ResultClicks"
              field="clicks"
              value={resultMeta.clicks}
              type="clicks"
            />
          </EuiFlexItem>
        )}
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
