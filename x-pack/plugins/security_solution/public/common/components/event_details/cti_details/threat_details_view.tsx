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
  EuiLink,
} from '@elastic/eui';
import React, { Fragment } from 'react';

import { StyledEuiInMemoryTable } from '../summary_view';
import { getSummaryColumns, SummaryRow, ThreatDetailsRow } from '../helpers';
import { EmptyThreatDetailsView } from './empty_threat_details_view';
import {
  FIRSTSEEN,
  EVENT_URL,
  EVENT_REFERENCE,
  MATCHED_ID,
} from '../../../../../common/cti/constants';
import { CtiEnrichment } from '../../../../../common/search_strategy/security_solution/cti';
import { getEnrichmentValue, getFirstElement } from './helpers';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../common/constants';

const getFirstSeen = (enrichment: CtiEnrichment): number => {
  const firstSeenValue = getEnrichmentValue(enrichment, FIRSTSEEN);
  const firstSeenDate = Date.parse(firstSeenValue ?? 'no date');
  return Number.isInteger(firstSeenDate) ? firstSeenDate : new Date(-1).valueOf();
};

const ThreatDetailsDescription: React.FC<ThreatDetailsRow['description']> = ({
  fieldName,
  value,
}) => {
  const tooltipChild = [EVENT_URL, EVENT_REFERENCE].includes(fieldName) ? (
    <EuiLink href={value} target="_blank">
      {value}
    </EuiLink>
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

const columns: Array<EuiBasicTableColumn<SummaryRow>> = getSummaryColumns(ThreatDetailsDescription);

const buildThreatDetailsItems = (enrichment: CtiEnrichment) =>
  Object.keys(enrichment).map((field) => {
    const displayField = field.startsWith(DEFAULT_INDICATOR_SOURCE_PATH)
      ? field.replace(`${DEFAULT_INDICATOR_SOURCE_PATH}.`, '')
      : field;

    return {
      title: displayField,
      description: {
        fieldName: field,
        value: getFirstElement(enrichment[field]),
      },
    };
  });

const ThreatDetailsViewComponent: React.FC<{
  enrichments: CtiEnrichment[];
}> = ({ enrichments }) => {
  if (enrichments.length < 1) {
    return <EmptyThreatDetailsView />;
  }

  const sortedEnrichments = enrichments.sort((a, b) => getFirstSeen(b) - getFirstSeen(a));

  return (
    <>
      <EuiSpacer size="l" />
      {sortedEnrichments.map((enrichment, index) => {
        const key = getEnrichmentValue(enrichment, MATCHED_ID);
        return (
          <Fragment key={key}>
            <StyledEuiInMemoryTable
              columns={columns}
              items={buildThreatDetailsItems(enrichment)}
              dataTestSubj={`threat-details-view-${index}`}
            />
            {index < enrichments.length - 1 && <EuiHorizontalRule />}
          </Fragment>
        );
      })}
    </>
  );
};

export const ThreatDetailsView = React.memo(ThreatDetailsViewComponent);
