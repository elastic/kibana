/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled, { css } from 'styled-components';
import { get } from 'lodash/fp';
import React from 'react';
import {
  EuiTitle,
  EuiLoadingSpinner,
  EuiPanel,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiIcon,
  EuiToolTip,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { partition } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import * as i18n from './translations';
import { CtiEnrichment } from '../../../../../common/search_strategy/security_solution/cti';
import { getEnrichmentIdentifiers, isInvestigationTimeEnrichment } from './helpers';

import { FieldsData } from '../types';
import { ActionCell } from '../table/action_cell';
import { BrowserField, BrowserFields, TimelineEventsDetailsItem } from '../../../../../common';
import { FormattedFieldValue } from '../../../../timelines/components/timeline/body/renderers/formatted_field';
import { RISKY_HOSTS_DOC_LINK } from '../../../../overview/components/overview_risky_host_links/risky_hosts_disabled_module';

import { HostRiskScore } from '../../../../timelines/containers/host_risk_score/use_host_risk_score';

export interface ThreatSummaryDescription {
  browserField: BrowserField;
  data: FieldsData | undefined;
  eventId: string;
  index: number;
  provider: string | undefined;
  timelineId: string;
  value: string | undefined;
}

const rightMargin = css`
  margin-right: ${({ theme }) => theme.eui.paddingSizes.xs};
  min-width: 30px;
`;

const tableCell = css`
  display: table-cell;
  vertical-align: middle;
  line-height: 24px;
  height: 24px;
`;

const RightMargin = styled.span`
  ${rightMargin}
`;

const UppercaseEuiTitle = styled(EuiTitle)`
  text-transform: uppercase;
  ${tableCell}
`;

const ThreatSummaryPanelTitle: React.FC = ({ children }) => (
  <UppercaseEuiTitle size="xxxs">
    <h5>{children}</h5>
  </UppercaseEuiTitle>
);

const EnrichmentFieldProvider = styled.span`
  ${rightMargin}
  white-space: nowrap;
  font-style: italic;
`;

const StyledEnrichmentFieldTitle = styled(EuiTitle)`
  width: 220px;
  ${rightMargin}
  ${tableCell}
`;

const EnrichmentFieldTitle: React.FC<{
  title: string | undefined;
}> = ({ title }) => (
  <StyledEnrichmentFieldTitle size="xxxs">
    <h6>{title}</h6>
  </StyledEnrichmentFieldTitle>
);

const EnrichmentFieldValue = styled.span`
  ${tableCell}
`;

const EnrichmentDescription: React.FC<ThreatSummaryDescription> = ({
  browserField,
  data,
  eventId,
  index,
  provider,
  timelineId,
  value,
}) => {
  if (!data || !value) return null;
  const key = `alert-details-value-formatted-field-value-${timelineId}-${eventId}-${data.field}-${value}-${index}-${provider}`;
  return (
    <EuiFlexGroup key={key} direction={'row'} gutterSize={'none'}>
      <RightMargin>
        <FormattedFieldValue
          contextId={timelineId}
          eventId={key}
          fieldFormat={data.format}
          fieldName={data.field}
          fieldType={data.type}
          isDraggable={false}
          isObjectArray={data.isObjectArray}
          value={value}
        />
      </RightMargin>
      {provider && (
        <EnrichmentFieldProvider>
          {i18n.PROVIDER_PREPOSITION} {provider}
        </EnrichmentFieldProvider>
      )}

      {value && (
        <ActionCell
          data={data}
          contextId={timelineId}
          eventId={key}
          fieldFromBrowserField={browserField}
          timelineId={timelineId}
          values={[value]}
        />
      )}
    </EuiFlexGroup>
  );
};

const EnrichedDataRow: React.FC<{ field: string | undefined; value: React.ReactNode }> = ({
  field,
  value,
}) => (
  <EuiFlexGroup direction="row" gutterSize="none" responsive>
    <EuiFlexItem style={{ flexShrink: 0 }} grow={false}>
      <EnrichmentFieldTitle title={field} />
    </EuiFlexItem>
    <EuiFlexItem>
      <EnrichmentFieldValue>{value}</EnrichmentFieldValue>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const ThreatSummaryPanelHeader: React.FC<{ title: string; toolTipContent: React.ReactNode }> = ({
  title,
  toolTipContent,
}) => (
  <EuiFlexGroup direction="row" gutterSize="none">
    <EuiFlexItem>
      <ThreatSummaryPanelTitle>{title}</ThreatSummaryPanelTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiToolTip title={title} content={toolTipContent}>
        <EuiIcon type="iInCircle" size="m" />
      </EuiToolTip>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const ThreatSummaryEnrichmentData: React.FC<{
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  enrichments: CtiEnrichment[];
  timelineId: string;
  eventId: string;
}> = ({ browserFields, data, enrichments, timelineId, eventId }) => {
  const parsedEnrichments = enrichments.map((enrichment, index) => {
    const { field, type, provider, value } = getEnrichmentIdentifiers(enrichment);
    const eventData = data.find((item) => item.field === field);
    const category = eventData?.category ?? '';
    const browserField = get([category, 'fields', field ?? ''], browserFields);

    const fieldsData: FieldsData = {
      field: field ?? '',
      format: browserField?.format ?? '',
      type: browserField?.type ?? '',
      isObjectArray: eventData?.isObjectArray ?? false,
    };

    return {
      fieldsData,
      type,
      provider,
      index,
      field,
      browserField,
      value,
    };
  });

  const [investigation, indicator] = partition(parsedEnrichments, ({ type }) =>
    isInvestigationTimeEnrichment(type)
  );

  return (
    <>
      {indicator.length > 0 && (
        <>
          <EuiPanel hasBorder paddingSize="s" borderRadius="none" grow={false}>
            <ThreatSummaryPanelHeader
              title={i18n.INDICATOR_ENRICHMENT_TITLE}
              toolTipContent={i18n.INDICATOR_TOOLTIP_CONTENT}
            />

            {indicator.map(({ fieldsData, index, field, provider, browserField, value }) => (
              <EnrichedDataRow
                key={field}
                field={field}
                value={
                  <EnrichmentDescription
                    eventId={eventId}
                    index={index}
                    provider={provider}
                    timelineId={timelineId}
                    value={value}
                    data={fieldsData}
                    browserField={browserField}
                  />
                }
              />
            ))}
          </EuiPanel>
          <EuiSpacer size="m" />
        </>
      )}

      {investigation.length > 0 && (
        <>
          <EuiPanel hasBorder paddingSize="s" borderRadius="none" grow={false}>
            <ThreatSummaryPanelHeader
              title={i18n.INVESTIGATION_ENRICHMENT_TITLE}
              toolTipContent={i18n.INVESTIGATION_TOOLTIP_CONTENT}
            />

            {investigation.map(({ fieldsData, index, field, provider, browserField, value }) => (
              <EnrichedDataRow
                key={field}
                field={field}
                value={
                  <EnrichmentDescription
                    eventId={eventId}
                    index={index}
                    provider={provider}
                    timelineId={timelineId}
                    value={value}
                    data={fieldsData}
                    browserField={browserField}
                  />
                }
              />
            ))}
          </EuiPanel>
          <EuiSpacer size="m" />
        </>
      )}
    </>
  );
};

const HostRiskDataBlock: React.FC<{
  hostRisk: HostRiskScore;
}> = ({ hostRisk }) => {
  return (
    <>
      <EuiPanel hasBorder paddingSize="s" borderRadius="none" grow={false}>
        <ThreatSummaryPanelHeader
          title={i18n.HOST_RISK_DATA_TITLE}
          toolTipContent={
            <FormattedMessage
              id="xpack.securitySolution.alertDetails.overview.hostDataTooltipContent"
              defaultMessage="Risk classification is displayed only when available for a host. Ensure {hostRiskScoreDocumentationLink} is enabled within your environment."
              values={{
                hostRiskScoreDocumentationLink: (
                  <EuiLink href={RISKY_HOSTS_DOC_LINK} target="_blank">
                    <FormattedMessage
                      id="xpack.securitySolution.alertDetails.overview.hostRiskScoreLink"
                      defaultMessage="Host Risk Score"
                    />
                  </EuiLink>
                ),
              }}
            />
          }
        />

        {hostRisk.loading && <EuiLoadingSpinner />}

        {!hostRisk.loading && (!hostRisk.isModuleEnabled || hostRisk.fields.length === 0) && (
          <EnrichmentFieldValue>
            <EuiText color="subdued" size="xs">
              {i18n.NO_HOST_RISK_DATA_DESCRIPTION}
            </EuiText>
          </EnrichmentFieldValue>
        )}

        {hostRisk.isModuleEnabled &&
          hostRisk.fields.map(({ field, value }) => (
            <EnrichedDataRow field={field} value={value} key={field} />
          ))}
      </EuiPanel>
      <EuiSpacer size="m" />
    </>
  );
};

const ThreatSummaryViewComponent: React.FC<{
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  enrichments: CtiEnrichment[];
  eventId: string;
  timelineId: string;
  hostRisk?: HostRiskScore;
}> = ({ browserFields, data, enrichments, eventId, timelineId, hostRisk }) => {
  if (!hostRisk && enrichments.length === 0) {
    return null;
  }

  return (
    <>
      <EuiHorizontalRule />

      <EuiTitle size="xxxs">
        <h5>{i18n.ENRICHED_DATA}</h5>
      </EuiTitle>
      <EuiSpacer size="s" />

      {hostRisk && <HostRiskDataBlock hostRisk={hostRisk} />}
      <ThreatSummaryEnrichmentData
        browserFields={browserFields}
        data={data}
        enrichments={enrichments}
        timelineId={timelineId}
        eventId={eventId}
      />
    </>
  );
};

export const ThreatSummaryView = React.memo(ThreatSummaryViewComponent);
