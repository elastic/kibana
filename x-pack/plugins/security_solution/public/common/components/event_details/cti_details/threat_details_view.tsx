/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import styled from 'styled-components';
import {
  EuiAccordion,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import React from 'react';
import { groupBy } from 'lodash';

import { StyledEuiInMemoryTable } from '../summary_view';
import { getSummaryColumns, SummaryRow, ThreatDetailsRow } from '../helpers';
import {
  FIRSTSEEN,
  EVENT_URL,
  EVENT_REFERENCE,
  ENRICHMENT_TYPES,
  ENRICHMENT_TYPE,
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
import { EnrichmentIcon } from './enrichment_icon';
import { useKibana } from '../../../lib/kibana';

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

const InlineBlock = styled.div`
  display: inline-block;
  line-height: 1.7em;
`;

const NoIntelligenceCTA: React.FC<{}> = () => {
  const threatIntelDocsUrl = `${
    useKibana().services.docLinks.links.filebeat.base
  }/filebeat-module-threatintel.html`;
  return (
    <>
      <span>{i18n.INDICATOR_TOOLTIP_CONTENT}</span>
      <span>{i18n.IF_CTI_NOT_ENABLED}</span>
      <span>
        <EuiLink href={threatIntelDocsUrl} target="_blank">
          {i18n.CHECK_DOCS}
        </EuiLink>
      </span>
    </>
  );
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
  Object.keys(enrichment)
    .sort()
    .map((field) => ({
      title: field.startsWith(DEFAULT_INDICATOR_SOURCE_PATH)
        ? field.replace(`${DEFAULT_INDICATOR_SOURCE_PATH}.`, '')
        : field,
      description: {
        fieldName: field,
        value: getFirstElement(enrichment[field]),
      },
    }));

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

const getMessagesFromType = (type?: ENRICHMENT_TYPE) => {
  let title;
  let dataTestSubj;
  let noData;
  if (type === ENRICHMENT_TYPES.IndicatorMatchRule) {
    dataTestSubj = 'threat-match-detected';
    title = i18n.INDICATOR_TOOLTIP_TITLE;
    noData = <NoIntelligenceCTA />;
  } else if (type === ENRICHMENT_TYPES.InvestigationTime) {
    dataTestSubj = 'enriched-with-threat-intel';
    title = i18n.INVESTIGATION_TOOLTIP_TITLE;
    noData = i18n.NO_INVESTIGATION_ENRICHMENTS_DESCRIPTION;
  } else {
    dataTestSubj = 'matches-with-no-type';
  }
  return { dataTestSubj, title, noData };
};

const EnrichmentSection: React.FC<{ enrichments: CtiEnrichment[]; type?: ENRICHMENT_TYPE }> = ({
  enrichments,
  type,
}) => {
  const { dataTestSubj, title, noData } = getMessagesFromType(type);
  return (
    <div data-test-subj={dataTestSubj}>
      {type && (
        <>
          <EuiFlexGroup direction={'row'} gutterSize={'xs'} alignItems={'baseline'}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxxs">
                <h5>{title}</h5>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EnrichmentIcon type={type} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      )}
      {Array.isArray(enrichments) ? (
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
      ) : (
        noData && <InlineBlock data-test-subj={'no-intelligence-cta'}>{noData}</InlineBlock>
      )}
    </div>
  );
};

const ThreatDetailsViewComponent: React.FC<{
  enrichments: CtiEnrichment[];
  setRange: unknown;
}> = ({ enrichments }) => {
  const {
    [ENRICHMENT_TYPES.IndicatorMatchRule]: indicatorMatches,
    [ENRICHMENT_TYPES.InvestigationTime]: threatIntelEnrichments,
    undefined: matchesWithNoType,
  } = groupBy(enrichments, 'matched.type');

  return (
    <>
      <EuiSpacer size="m" />
      <EnrichmentSection
        enrichments={indicatorMatches}
        type={ENRICHMENT_TYPES.IndicatorMatchRule}
      />
      <EuiHorizontalRule />
      <EnrichmentSection
        enrichments={threatIntelEnrichments}
        type={ENRICHMENT_TYPES.InvestigationTime}
      />

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
