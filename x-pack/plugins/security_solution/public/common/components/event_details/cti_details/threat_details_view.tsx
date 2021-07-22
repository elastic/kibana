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
import { QUERY_ID } from '../../../containers/cti/event_enrichment/use_investigation_enrichment';
import { InspectButton } from '../../inspect';

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

const OverflowParent = styled.div`
  display: inline-grid;
`;

const OverflowContainer = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

const renderAccordion = (
  enrichment: CtiEnrichment,
  index: number,
  enrichments: CtiEnrichment[]
) => {
  const { id, field, provider, type, value } = getEnrichmentIdentifiers(enrichment);
  const accordionTitle = `${field} ${value} ${provider ? i18n.PROVIDER_PREPOSITION : ''} ${
    provider ? provider : ''
  }`;

  return (
    <StyledEuiAccordion
      id={id!}
      key={id}
      initialIsOpen={true}
      arrowDisplay={'right'}
      buttonContent={
        <OverflowParent>
          <OverflowContainer>{accordionTitle}</OverflowContainer>
        </OverflowParent>
      }
      extraAction={
        isInvestigationTimeEnrichment(type) ? (
          <EuiFlexItem grow={false}>
            <InspectButton queryId={QUERY_ID} title={i18n.INVESTIGATION_QUERY_TITLE} />
          </EuiFlexItem>
        ) : (
          <EuiFlexItem />
        )
      }
    >
      <StyledEuiInMemoryTable
        columns={columns}
        compressed
        data-test-subj={`threat-details-view-${index}`}
        items={buildThreatDetailsItems(enrichment)}
      />
      {index < enrichments.length - 1 && <EuiSpacer size="m" />}
    </StyledEuiAccordion>
  );
};

const renderSortedEnrichments = (enrichments: CtiEnrichment[]) =>
  enrichments.sort((a, b) => getFirstSeen(b) - getFirstSeen(a)).map(renderAccordion);

const ThreatDetailsViewComponent: React.FC<{
  enrichments: CtiEnrichment[];
}> = ({ enrichments }) => {
  const {
    indicator_match_rule: indicatorMatches,
    investigation_time: threatIntelEnrichments,
  } = groupBy(enrichments, 'matched.type');

  return (
    <>
      <EuiSpacer size="m" />
      {indicatorMatches && (
        <div data-test-sub={'threat-match-detected'}>
          <EuiTitle size="xxxs">
            <h5>{i18n.INDICATOR_TOOLTIP_TITLE}</h5>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="xxxs">
            <FormattedMessage
              id={'xpack.securitySolution.alertDetails.threatDetails.threatMatchSubtitle'}
              defaultMessage={
                'We have found {totalCount, plural, one {# field value} other {# field values}} matched a threat intelligence indicator with a rule you created.'
              }
              values={{
                totalCount: indicatorMatches.length,
              }}
            />
          </EuiText>
          <EuiSpacer size="s" />
          {renderSortedEnrichments(indicatorMatches)}
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
            {/* TODO: Date form */}
            <EuiText size="xxxs">
              <FormattedMessage
                id={'xpack.securitySolution.alertDetails.threatDetails.investigationSubtitle'}
                defaultMessage={
                  'We have found {totalCount, plural, one {# field value} other {# field values}} has additional information available from threat intelligence sources we searched in the past 30 days by default.'
                }
                values={{
                  totalCount: threatIntelEnrichments.length,
                }}
              />
            </EuiText>
            <EuiSpacer size="s" />
            {renderSortedEnrichments(threatIntelEnrichments)}
          </>
        </div>
      )}
    </>
  );
};

export const ThreatDetailsView = React.memo(ThreatDetailsViewComponent);
