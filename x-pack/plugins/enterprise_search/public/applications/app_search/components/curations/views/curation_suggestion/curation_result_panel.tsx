/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { Result } from '../../../result';
import { Result as ResultType } from '../../../result/types';
import './curation_result_panel.scss';

interface Props {
  variant: 'current' | 'promoted' | 'suggested' | 'hidden';
  results: ResultType[];
}

export const CurationResultPanel: React.FC<Props> = ({ variant = 'current', results }) => {
  return (
    <>
      <EuiFlexGroup className="curationResultPanel__header" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge>3</EuiNotificationBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <h5>Promoted results</h5>
          </EuiTitle>
        </EuiFlexItem>
        {variant === 'suggested' && (
          <EuiFlexItem>
            <EuiText color="subdued" textAlign="right" size="xs">
              <p>This curation can be automated by App Search</p>
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
          results.map((result) => (
            <EuiFlexItem grow={false}>
              <Result result={result} isMetaEngine={false} />
            </EuiFlexItem>
          ))
        ) : (
          <EuiText size="s">
            <p>
              <b>There are currently no promoted documents for this query</b>
            </p>
          </EuiText>
        )}
      </EuiFlexGroup>
    </>
  );
};
