/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import styled, { type AnyStyledComponent } from 'styled-components';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiInMemoryTable,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { THREAT_INTELLIGENCE_ENRICHMENTS_ACCORDION_TABLE_TEST_ID } from './test_ids';
import type { CtiEnrichment } from '../../../../../common/search_strategy';
import { QUERY_ID } from '../../../../common/containers/cti/event_enrichment';
import { InspectButton } from '../../../../common/components/inspect';
import {
  getEnrichmentIdentifiers,
  isInvestigationTimeEnrichment,
  buildThreatDetailsItems,
} from '../../shared/utils/threat_intelligence';
import { EnrichmentButtonContent } from './threat_details_view_enrichment_button_content';
import { REFERENCE } from '../../../../../common/cti/constants';

const StyledH5 = styled.h5`
  line-height: 1.7rem;
`;

const StyledEuiAccordion = styled(EuiAccordion)`
  .euiAccordion__triggerWrapper {
    background: ${({ theme }) => theme.eui.euiColorLightestShade};
    border-radius: ${({ theme }) => theme.eui.euiSizeXS};
    height: ${({ theme }) => theme.eui.euiSizeXL};
    margin-bottom: ${({ theme }) => theme.eui.euiSizeS};
    padding-left: ${({ theme }) => theme.eui.euiSizeS};
  }
`;

const StyledEuiInMemoryTable = styled(EuiInMemoryTable as unknown as AnyStyledComponent)`
  .euiTableHeaderCell,
  .euiTableRowCell {
    border: none;
  }
  .euiTableHeaderCell .euiTableCellContent {
    padding: 0;
  }
`;

const INVESTIGATION_QUERY_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.threat-intelligence.investigationTimeQueryTitle',
  {
    defaultMessage: 'Enrichment with Threat Intelligence',
  }
);

interface ThreatDetailsRow {
  /**
   *
   */
  title: string;
  /**
   *
   */
  description: {
    /**
     *
     */
    fieldName: string;
    /**
     *
     */
    value: string;
  };
}

const columns: Array<EuiBasicTableColumn<ThreatDetailsRow>> = [
  {
    field: 'title',
    truncateText: false,
    render: (title: string) => (
      <EuiTitle size="xxxs">
        <StyledH5>{title}</StyledH5>
      </EuiTitle>
    ),
    width: '220px',
    name: '',
  },
  {
    field: 'description',
    truncateText: false,
    render: (description: ThreatDetailsRow['description']) => {
      const { fieldName, value } = description;
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
    },
    name: '',
  },
];

export interface EnrichmentAccordionProps {
  /**
   *
   */
  enrichment: CtiEnrichment;
  /**
   *
   */
  index: number;
}

/**
 *
 */
export const EnrichmentAccordion = memo(({ enrichment, index }: EnrichmentAccordionProps) => {
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
            <InspectButton queryId={QUERY_ID} title={INVESTIGATION_QUERY_TITLE} />
          </EuiFlexItem>
        )
      }
    >
      <StyledEuiInMemoryTable
        columns={columns}
        compressed
        data-test-subj={`${THREAT_INTELLIGENCE_ENRICHMENTS_ACCORDION_TABLE_TEST_ID}-${index}`}
        items={buildThreatDetailsItems(enrichment)}
      />
    </StyledEuiAccordion>
  );
});

EnrichmentAccordion.displayName = 'EnrichmentAccordion';
