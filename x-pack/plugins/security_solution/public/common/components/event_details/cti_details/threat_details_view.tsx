/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import styled from 'styled-components';
import {
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiToolTip,
  EuiLink,
  EuiText,
  EuiAccordion,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { groupBy } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';

import { StyledEuiInMemoryTable } from '../summary_view';
import { getSummaryColumns, SummaryRow, ThreatDetailsRow } from '../helpers';
import {
  FIRSTSEEN,
  EVENT_URL,
  EVENT_REFERENCE,
  ENRICHMENT_TYPES,
} from '../../../../../common/cti/constants';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../common/constants';
import { getFirstElement } from '../../../../../common/utils/data_retrieval';
import { CtiEnrichment } from '../../../../../common/search_strategy/security_solution/cti';
import {
  getShimmedIndicatorValue,
  isInvestigationTimeEnrichment,
  getEnrichmentIdentifiers,
} from './helpers';
import * as i18n from './translations';
import { QUERY_ID } from '../../../containers/cti/event_enrichment/use_investigation_enrichment';
import { InspectButton } from '../../inspect';
import { EnrichmentButtonContent } from './enrichment_button_content';

const getFirstSeen = (enrichment: CtiEnrichment): number => {
  const firstSeenValue = getShimmedIndicatorValue(enrichment, FIRSTSEEN);
  const firstSeenDate = Date.parse(firstSeenValue ?? 'no date');
  return Number.isInteger(firstSeenDate) ? firstSeenDate : new Date(-1).valueOf();
};

const StyledEuiAccordion = styled(EuiAccordion)`
  .euiAccordion__triggerWrapper {
    background: ${({ theme }) => theme.eui.euiColorLightestShade};
    height: ${({ theme }) => theme.eui.paddingSizes.xl};
    border-radius: ${({ theme }) => theme.eui.paddingSizes.xs};
    padding-left: ${({ theme }) => theme.eui.paddingSizes.s};
    margin-bottom: ${({ theme }) => theme.eui.paddingSizes.s};
  }
`;

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

const EnrichmentAccordion: React.FC<{
  enrichment: CtiEnrichment;
  index: number;
  enrichmentsLength: number;
}> = ({ enrichment, index, enrichmentsLength }) => {
  const { id = `threat-details-item`, field, provider, type, value } = getEnrichmentIdentifiers(
    enrichment
  );
  const accordionId = `${id}${field}`;
  return (
    <StyledEuiAccordion
      id={accordionId}
      key={accordionId}
      initialIsOpen={true}
      arrowDisplay={'right'}
      buttonContent={<EnrichmentButtonContent field={field} provider={provider} value={value} />}
      extraAction={
        isInvestigationTimeEnrichment(type) && (
          <EuiFlexItem grow={false}>
            <InspectButton queryId={QUERY_ID} title={i18n.INVESTIGATION_QUERY_TITLE} />
          </EuiFlexItem>
        )
      }
    >
      <StyledEuiInMemoryTable
        columns={columns}
        compressed
        data-test-subj={`threat-details-view-${index}`}
        items={buildThreatDetailsItems(enrichment)}
      />
      {index < enrichmentsLength - 1 && <EuiSpacer size="m" />}
    </StyledEuiAccordion>
  );
};

const EnrichmentSection: React.FC<{ enrichments: CtiEnrichment[] }> = ({ enrichments }) => (
  <>
    {enrichments
      .sort((a, b) => getFirstSeen(b) - getFirstSeen(a))
      .map((enrichment, index) => (
        <EnrichmentAccordion
          enrichment={enrichment}
          index={index}
          enrichmentsLength={enrichments.length}
        />
      ))}
  </>
);

const ThreatDetailsViewComponent: React.FC<{
  enrichments: CtiEnrichment[];
}> = ({ enrichments }) => {
  const {
    [ENRICHMENT_TYPES.IndicatorMatchRule]: indicatorMatches,
    [ENRICHMENT_TYPES.InvestigationTime]: threatIntelEnrichments,
    undefined: matchesWithNoType,
  } = groupBy(enrichments, 'matched.type');

  return (
    <>
      <EuiSpacer size="m" />
      {indicatorMatches && (
        <div data-test-subj={'threat-match-detected'}>
          <EuiTitle size="xxxs">
            <h5>{i18n.INDICATOR_TOOLTIP_TITLE}</h5>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.securitySolution.alertDetails.threatDetails.threatMatchSubtitle"
              defaultMessage="We have found {totalCount, plural, one {# field value} other {# field values}} matched a threat intelligence indicator with a rule you created."
              values={{
                totalCount: indicatorMatches.length,
              }}
            />
          </EuiText>
          <EuiSpacer size="s" />
          <EnrichmentSection enrichments={indicatorMatches} />
        </div>
      )}
      {threatIntelEnrichments && (
        <div data-test-subj={'enriched-with-threat-intel'}>
          {indicatorMatches && <EuiSpacer size="l" />}
          <>
            <EuiTitle size="xxxs">
              <h5>{i18n.INVESTIGATION_TOOLTIP_TITLE}</h5>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="xs">
              <FormattedMessage
                id="xpack.securitySolution.alertDetails.threatDetails.investigationSubtitle"
                defaultMessage="We have found {totalCount, plural, one {# field value} other {# field values}} has additional information available from threat intelligence sources we searched in the past 30 days by default."
                values={{
                  totalCount: threatIntelEnrichments.length,
                }}
              />
            </EuiText>
            <EuiSpacer size="s" />
            <EnrichmentSection enrichments={threatIntelEnrichments} />
          </>
        </div>
      )}
      {matchesWithNoType && (
        <div data-test-subj={'matches-with-no-type'}>
          {indicatorMatches && <EuiSpacer size="l" />}
          <EnrichmentSection enrichments={matchesWithNoType} />
        </div>
      )}
    </>
  );
};

export const ThreatDetailsView = React.memo(ThreatDetailsViewComponent);
