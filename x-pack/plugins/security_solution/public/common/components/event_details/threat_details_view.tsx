/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiToolTip,
  EuiTitle,
  euiPaletteGray,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import * as i18n from './translations';
import { SummaryView } from './summary_view';
import { getSummaryColumns, SummaryRow, ThreatDetailsRow } from './helpers';

const linkFields = ['threat.indicator.event.url', 'threat.indicator.event.reference'];

const StyledNoEnrichmentContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  h2 {
    padding: 5% 10% 0%;
  }
`;

const StyledSpan = styled.span`
  color: ${euiPaletteGray(5)[2]};
  line-height: 1.8em;
  padding: 5% 10%;
`;

const ThreatDetailsDescription: React.FC<ThreatDetailsRow['description']> = ({
  fieldName,
  value,
}) => {
  const tooltipChild = linkFields.some((field) => field === fieldName) ? (
    <a href={value} target="_blank" rel="noreferrer">
      {value}
    </a>
  ) : (
    <span>{value}</span>
  );
  return (
    <EuiToolTip
      data-test-subj="message-tool-tip"
      content={
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem grow={false}>
            <span>{fieldName}</span>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      {tooltipChild}
    </EuiToolTip>
  );
};
const summaryColumns: Array<EuiBasicTableColumn<SummaryRow>> = getSummaryColumns(
  ThreatDetailsDescription
);

const ThreatDetailsViewComponent: React.FC<{
  threatDetailsRows: ThreatDetailsRow[][];
}> = ({ threatDetailsRows }) =>
  !threatDetailsRows[0] || threatDetailsRows[0].length === 0 ? (
    <StyledNoEnrichmentContainer data-test-subj="empty-threat-details-view">
      <EuiSpacer size="xxl" />
      <EuiTitle size="m">
        <h2>{i18n.NO_ENRICHMENT_FOUND}</h2>
      </EuiTitle>
      <StyledSpan>
        {i18n.IF_CTI_NOT_ENABLED}
        <a
          href="https://www.elastic.co/guide/en/beats/filebeat/7.12/filebeat-module-threatintel.html"
          target="_blank"
          rel="noreferrer"
        >
          {i18n.CHECK_DOCS}
        </a>
      </StyledSpan>
    </StyledNoEnrichmentContainer>
  ) : (
    <>
      {threatDetailsRows.map((summaryRows, index, arr) => {
        const key = summaryRows.find((threat) => threat.title === 'matched.id')?.description
          .value[0];
        return (
          <div key={`${key}-${index}`}>
            {index === 0 && <EuiSpacer size="l" />}
            <SummaryView
              summaryColumns={summaryColumns}
              summaryRows={summaryRows}
              dataTestSubj={`threat-details-view-${index}`}
            />
            {index < arr.length - 1 && <EuiHorizontalRule />}
          </div>
        );
      })}
    </>
  );

export const ThreatDetailsView = React.memo(ThreatDetailsViewComponent);
