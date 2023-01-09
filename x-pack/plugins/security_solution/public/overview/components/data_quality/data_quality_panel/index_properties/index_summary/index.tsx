/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
  EuiStat,
  EuiToolTip,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { getDocsCountPercent } from './helpers';
import { IndexLabel } from './index_label';
import * as i18n from './translations';
import type { IlmPhase } from '../../../types';

const ProgressContainer = styled.div`
  width: 85%;
`;

interface Props {
  docsCount: number;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  pattern: string;
  patternDocsCount: number;
}

const IndexSummaryComponent: React.FC<Props> = ({
  docsCount,
  indexName,
  ilmPhase,
  pattern,
  patternDocsCount,
}) => {
  const label = useMemo(
    () => <IndexLabel ilmPhase={ilmPhase} indexName={indexName} pattern={pattern} />,
    [ilmPhase, indexName, pattern]
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
      <EuiFlexItem grow={true}>
        <EuiSpacer size="xs" />
        <ProgressContainer>
          <EuiProgress
            label={label}
            max={patternDocsCount}
            size="m"
            value={docsCount}
            valueText={getDocsCountPercent({ docsCount, patternDocsCount })}
          />
        </ProgressContainer>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={i18n.INDEX_DOCS_COUNT_TOOL_TIP(indexName)}>
          <EuiStat description={i18n.DOCS_COUNT_LABEL} reverse title={docsCount} titleSize="xs" />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

IndexSummaryComponent.displayName = 'IndexSummaryComponent';

export const IndexSummary = React.memo(IndexSummaryComponent);
