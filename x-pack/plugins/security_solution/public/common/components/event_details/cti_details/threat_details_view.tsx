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
  EuiLoadingContent,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import React from 'react';
import { groupBy } from 'lodash';

import { StyledEuiInMemoryTable } from '../summary_view';
import { getSummaryColumns, SummaryRow, ThreatDetailsRow } from '../helpers';
import {
  EnrichmentType,
  ENRICHMENT_TYPES,
  EVENT_REFERENCE,
  EVENT_URL,
  FIRSTSEEN,
} from '../../../../../common/cti/constants';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../common/constants';
import { getFirstElement } from '../../../../../common/utils/data_retrieval';
import { CtiEnrichment } from '../../../../../common/search_strategy/security_solution/cti';
import {
  getEnrichmentIdentifiers,
  getShimmedIndicatorValue,
  isInvestigationTimeEnrichment,
} from './helpers';
import * as i18n from './translations';
import {
  QUERY_ID,
  RangePickerProps,
} from '../../../containers/cti/event_enrichment/use_investigation_enrichment';
import { InspectButton } from '../../inspect';
import { EnrichmentButtonContent } from './enrichment_button_content';
import { EnrichmentIcon } from './enrichment_icon';
import { useKibana } from '../../../lib/kibana';
import { EnrichmentRangePicker } from './enrichment_range_picker';

const getFirstSeen = (enrichment: CtiEnrichment): number => {
  const firstSeenValue = getShimmedIndicatorValue(enrichment, FIRSTSEEN);
  const firstSeenDate = Date.parse(firstSeenValue ?? 'no date');
  return Number.isInteger(firstSeenDate) ? firstSeenDate : new Date(-1).valueOf();
};

const StyledEuiAccordion = styled(EuiAccordion)`
  .euiAccordion__triggerWrapper {
    background: ${({ theme }) => theme.eui.euiColorLightestShade};
    border-radius: ${({ theme }) => theme.eui.paddingSizes.xs};
    height: ${({ theme }) => theme.eui.paddingSizes.xl};
    margin-bottom: ${({ theme }) => theme.eui.paddingSizes.s};
    padding-left: ${({ theme }) => theme.eui.paddingSizes.s};
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

const getMessagesFromType = (type?: EnrichmentType) => {
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

const EnrichmentSection: React.FC<{
  enrichments: CtiEnrichment[];
  type?: EnrichmentType;
  rangePickerProps?: RangePickerProps;
}> = ({ enrichments, type, rangePickerProps }) => {
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
      {rangePickerProps && (
        <>
          <EnrichmentRangePicker {...rangePickerProps} />
          <EuiSpacer size="m" />
        </>
      )}
      {Array.isArray(enrichments) ? (
        <>
          {enrichments
            .sort((a, b) => getFirstSeen(b) - getFirstSeen(a))
            .map((enrichment, index) => (
              <EnrichmentAccordion
                key={`${enrichment.id}`}
                enrichment={enrichment}
                index={index}
                enrichmentsLength={enrichments.length}
              />
            ))}
        </>
      ) : (
        <>
          {noData && <InlineBlock data-test-subj={'no-enrichments-found'}>{noData}</InlineBlock>}
          {rangePickerProps?.loading && (
            <EuiLoadingContent data-test-subj={'loading-enrichments'} lines={4} />
          )}
        </>
      )}
    </div>
  );
};

const ThreatDetailsViewComponent: React.FC<{
  enrichments: CtiEnrichment[];
  rangePickerProps: RangePickerProps;
}> = ({ enrichments, rangePickerProps }) => {
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
        rangePickerProps={rangePickerProps}
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
