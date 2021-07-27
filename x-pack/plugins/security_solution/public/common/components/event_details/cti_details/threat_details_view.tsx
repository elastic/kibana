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
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import React, { Fragment } from 'react';

import { StyledEuiInMemoryTable } from '../summary_view';
import { getSummaryColumns, SummaryRow, ThreatDetailsRow } from '../helpers';
import { FIRSTSEEN, EVENT_URL, EVENT_REFERENCE } from '../../../../../common/cti/constants';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../common/constants';
import { getFirstElement } from '../../../../../common/utils/data_retrieval';
import { CtiEnrichment } from '../../../../../common/search_strategy/security_solution/cti';
import {
  getShimmedIndicatorValue,
  isInvestigationTimeEnrichment,
  getEnrichmentIdentifiers,
} from './helpers';
import * as i18n from './translations';
import { EnrichmentIcon } from './enrichment_icon';
import { QUERY_ID } from '../../../containers/cti/event_enrichment/use_investigation_enrichment';
import { InspectButton } from '../../inspect';

const getFirstSeen = (enrichment: CtiEnrichment): number => {
  const firstSeenValue = getShimmedIndicatorValue(enrichment, FIRSTSEEN);
  const firstSeenDate = Date.parse(firstSeenValue ?? 'no date');
  return Number.isInteger(firstSeenDate) ? firstSeenDate : new Date(-1).valueOf();
};

const ThreatDetailsHeader: React.FC<{
  field: string | undefined;
  value: string | undefined;
  provider: string | undefined;
  type: string | undefined;
}> = ({ field, value, provider, type }) => (
  <>
    <EuiTextColor color="subdued">
      <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="xs" wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <span>{field}</span> <span>{value}</span>
          </EuiText>
        </EuiFlexItem>
        {provider && (
          <>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                {i18n.PROVIDER_PREPOSITION} {provider}
              </EuiText>
            </EuiFlexItem>
          </>
        )}
        <EuiFlexItem grow={false}>
          <EnrichmentIcon type={type} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>
        {isInvestigationTimeEnrichment(type) && (
          <EuiFlexItem grow={false}>
            <InspectButton queryId={QUERY_ID} title={i18n.INVESTIGATION_QUERY_TITLE} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiTextColor>
  </>
);

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
  Object.keys(enrichment)
    .sort()
    .map((field) => {
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
  const sortedEnrichments = enrichments.sort((a, b) => getFirstSeen(b) - getFirstSeen(a));

  return (
    <>
      <EuiSpacer size="m" />
      {sortedEnrichments.map((enrichment, index) => {
        const { id, field, provider, type, value } = getEnrichmentIdentifiers(enrichment);

        return (
          <Fragment key={id}>
            <ThreatDetailsHeader field={field} provider={provider} value={value} type={type} />
            <EuiSpacer size="m" />
            <StyledEuiInMemoryTable
              columns={columns}
              compressed
              data-test-subj={`threat-details-view-${index}`}
              items={buildThreatDetailsItems(enrichment)}
            />
            {index < sortedEnrichments.length - 1 && <EuiSpacer size="m" />}
          </Fragment>
        );
      })}
    </>
  );
};

export const ThreatDetailsView = React.memo(ThreatDetailsViewComponent);
