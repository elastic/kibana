/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EngineLogic } from '../../../engine';

import { Result } from '../../../result';
import { Result as ResultType } from '../../../result/types';
import './curation_result_panel.scss';

interface Props {
  variant: 'current' | 'promoted' | 'suggested' | 'hidden';
  results: ResultType[];
}

export const CurationResultPanel: React.FC<Props> = ({ variant, results }) => {
  const { isMetaEngine, engine } = useValues(EngineLogic);
  const count = results.length;

  return (
    <>
      <EuiFlexGroup className="curationResultPanel__header" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge data-test-subj="curationCount">{count}</EuiNotificationBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <h5>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.resultPanelTitle',
                { defaultMessage: 'Promoted results' }
              )}
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        {variant === 'suggested' && (
          <EuiFlexItem data-test-subj="suggestedText">
            <EuiText color="subdued" textAlign="right" size="xs">
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.resultPanelDescription',
                  { defaultMessage: 'This curation can be automated by App Search' }
                )}
              </p>
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiFlexGroup
        alignItems="center"
        justifyContent={results.length > 0 ? 'flexStart' : 'center'}
        gutterSize="s"
        direction="column"
        className={`curationResultPanel curationResultPanel--${variant}`}
      >
        {results.length > 0 ? (
          results.map((result, index) => (
            <EuiFlexItem key={result.id.raw} style={{ width: '100%' }} grow={false}>
              <Result
                result={result}
                isMetaEngine={isMetaEngine}
                schemaForTypeHighlights={engine.schema}
                resultPosition={index + 1}
                showClick
              />
            </EuiFlexItem>
          ))
        ) : (
          <EuiText size="s" data-test-subj="noResults">
            <p>
              <b>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.noResultsMessage',
                  { defaultMessage: 'There are currently no promoted documents for this query' }
                )}
              </b>
            </p>
          </EuiText>
        )}
      </EuiFlexGroup>
    </>
  );
};
