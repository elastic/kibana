/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiToolTip,
  EuiBasicTableColumn,
} from '@elastic/eui';

import { CtiEnrichment } from '../../../../../common/search_strategy/security_solution/cti';
import {
  getEnrichmentIdentifiers,
  isInvestigationTimeEnrichment,
  getFirstSeen,
  ThreatDetailsRow,
} from './helpers';
import { EnrichmentButtonContent } from './enrichment_button_content';
import { ThreatSummaryTitle } from './threat_summary_title';
import { InspectButton } from '../../inspect';
import { QUERY_ID } from '../../../containers/cti/event_enrichment';
import * as i18n from './translations';
import { ThreatSummaryTable } from './threat_summary_table';
import { REFERENCE } from '../../../../../common/cti/constants';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../common/constants';
import { getFirstElement } from '../../../../../common/utils/data_retrieval';

const StyledEuiAccordion = styled(EuiAccordion)`
  .euiAccordion__triggerWrapper {
    background: ${({ theme }) => theme.eui.euiColorLightestShade};
    border-radius: ${({ theme }) => theme.eui.paddingSizes.xs};
    height: ${({ theme }) => theme.eui.paddingSizes.xl};
    margin-bottom: ${({ theme }) => theme.eui.paddingSizes.s};
    padding-left: ${({ theme }) => theme.eui.paddingSizes.s};
  }
`;

const ThreatDetailsDescription: React.FC<ThreatDetailsRow['description']> = ({
  fieldName,
  value,
}) => {
  const tooltipChild = fieldName.match(REFERENCE) ? (
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

const columns: Array<EuiBasicTableColumn<ThreatDetailsRow>> = [
  {
    field: 'title',
    truncateText: false,
    render: ThreatSummaryTitle,
    width: '220px',
    name: '',
  },
  {
    field: 'description',
    truncateText: false,
    render: ThreatDetailsDescription,
    name: '',
  },
];

const buildThreatDetailsItems = (enrichment: CtiEnrichment) =>
  Object.keys(enrichment)
    .sort()
    .map((field) => ({
      title: field.startsWith(DEFAULT_INDICATOR_SOURCE_PATH)
        ? field.replace(`${DEFAULT_INDICATOR_SOURCE_PATH}`, 'indicator')
        : field,
      description: {
        fieldName: field,
        value: getFirstElement(enrichment[field]),
      },
    }));

const EnrichmentAccordion: React.FC<{
  enrichment: CtiEnrichment;
  index: number;
}> = ({ enrichment, index }) => {
  const {
    id = `threat-details-item`,
    field,
    feedName,
    type,
    value,
  } = getEnrichmentIdentifiers(enrichment);
  const accordionId = `${id}${field}`;
  return (
    <StyledEuiAccordion
      id={accordionId}
      key={accordionId}
      initialIsOpen={true}
      arrowDisplay="right"
      buttonContent={<EnrichmentButtonContent field={field} feedName={feedName} value={value} />}
      extraAction={
        isInvestigationTimeEnrichment(type) && (
          <EuiFlexItem grow={false}>
            <InspectButton queryId={QUERY_ID} title={i18n.INVESTIGATION_QUERY_TITLE} />
          </EuiFlexItem>
        )
      }
    >
      <ThreatSummaryTable
        columns={columns}
        compressed
        data-test-subj={`threat-details-view-${index}`}
        items={buildThreatDetailsItems(enrichment)}
      />
    </StyledEuiAccordion>
  );
};

export const EnrichmentAccordionGroup: React.FC<{ enrichments: CtiEnrichment[] }> = ({
  enrichments,
}) => (
  <>
    {enrichments
      .sort((a, b) => getFirstSeen(b) - getFirstSeen(a))
      .map((enrichment, index) => (
        <React.Fragment key={`${enrichment.id}`}>
          <EnrichmentAccordion enrichment={enrichment} index={index} />
          {index < enrichments.length - 1 && <EuiSpacer size="m" />}
        </React.Fragment>
      ))}
  </>
);
