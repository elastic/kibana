/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import { chunk, find } from 'lodash/fp';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';

import type { BrowserFields } from '../../../containers/source';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';
import type { EnrichedFieldInfo, EnrichedFieldInfoWithValues } from '../types';
import { getEnrichedFieldInfo } from '../helpers';
import {
  ALERTS_HEADERS_RISK_SCORE,
  ALERTS_HEADERS_RULE,
  ALERTS_HEADERS_SEVERITY,
  SIGNAL_STATUS,
} from '../../../../detections/components/alerts_table/translations';
import {
  SIGNAL_RULE_NAME_FIELD_NAME,
  SIGNAL_STATUS_FIELD_NAME,
} from '../../../../timelines/components/timeline/body/renderers/constants';
import { FormattedFieldValue } from '../../../../timelines/components/timeline/body/renderers/formatted_field';
import { OverviewCardWithActions } from '../overview/overview_card';
import { StatusPopoverButton } from '../overview/status_popover_button';
import { SeverityBadge } from '../../../../../public/detections/components/rules/severity_badge';
import { useThrottledResizeObserver } from '../../utils';
import { isNotNull } from '../../../../../public/timelines/store/timeline/helpers';

export const NotGrowingFlexGroup = euiStyled(EuiFlexGroup)`
  flex-grow: 0;
`;

interface Props {
  browserFields: BrowserFields;
  contextId: string;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  handleOnEventClosed: () => void;
  indexName: string;
  timelineId: string;
}

export const Overview = React.memo<Props>(
  ({ browserFields, contextId, data, eventId, handleOnEventClosed, indexName, timelineId }) => {
    const statusData = useMemo(() => {
      const item = find({ field: SIGNAL_STATUS_FIELD_NAME, category: 'kibana' }, data);
      return (
        item &&
        getEnrichedFieldInfo({
          eventId,
          contextId,
          timelineId,
          browserFields,
          item,
        })
      );
    }, [browserFields, contextId, data, eventId, timelineId]);

    const severityData = useMemo(() => {
      const item = find({ field: 'kibana.alert.severity', category: 'kibana' }, data);
      return (
        item &&
        getEnrichedFieldInfo({
          eventId,
          contextId,
          timelineId,
          browserFields,
          item,
        })
      );
    }, [browserFields, contextId, data, eventId, timelineId]);

    const riskScoreData = useMemo(() => {
      const item = find({ field: 'kibana.alert.risk_score', category: 'kibana' }, data);
      return (
        item &&
        getEnrichedFieldInfo({
          eventId,
          contextId,
          timelineId,
          browserFields,
          item,
        })
      );
    }, [browserFields, contextId, data, eventId, timelineId]);

    const ruleNameData = useMemo(() => {
      const item = find({ field: SIGNAL_RULE_NAME_FIELD_NAME, category: 'kibana' }, data);
      const linkValueField = find({ field: 'kibana.alert.rule.uuid', category: 'kibana' }, data);
      return (
        item &&
        getEnrichedFieldInfo({
          eventId,
          contextId,
          timelineId,
          browserFields,
          item,
          linkValueField,
        })
      );
    }, [browserFields, contextId, data, eventId, timelineId]);

    const signalCard = hasData(statusData) ? (
      <EuiFlexItem key="status">
        <OverviewCardWithActions
          title={SIGNAL_STATUS}
          enrichedFieldInfo={statusData}
          contextId={contextId}
        >
          <StatusPopoverButton
            eventId={eventId}
            contextId={contextId}
            enrichedFieldInfo={statusData}
            indexName={indexName}
            timelineId={timelineId}
            handleOnEventClosed={handleOnEventClosed}
          />
        </OverviewCardWithActions>
      </EuiFlexItem>
    ) : null;

    const severityCard = hasData(severityData) ? (
      <EuiFlexItem key="severity">
        <OverviewCardWithActions
          title={ALERTS_HEADERS_SEVERITY}
          enrichedFieldInfo={severityData}
          contextId={contextId}
        >
          <SeverityBadge value={severityData.values[0] as Severity} />
        </OverviewCardWithActions>
      </EuiFlexItem>
    ) : null;

    const riskScoreCard = hasData(riskScoreData) ? (
      <EuiFlexItem key="riskScore">
        <OverviewCardWithActions
          title={ALERTS_HEADERS_RISK_SCORE}
          enrichedFieldInfo={riskScoreData}
          contextId={contextId}
          dataTestSubj="riskScore"
        >
          {riskScoreData.values[0]}
        </OverviewCardWithActions>
      </EuiFlexItem>
    ) : null;

    const ruleNameCard = hasData(ruleNameData) ? (
      <EuiFlexItem key="ruleName">
        <OverviewCardWithActions
          title={ALERTS_HEADERS_RULE}
          enrichedFieldInfo={ruleNameData}
          contextId={contextId}
        >
          <FormattedFieldValue
            contextId={contextId}
            eventId={eventId}
            value={ruleNameData.values[0]}
            fieldName={ruleNameData.data.field}
            linkValue={ruleNameData.linkValue}
            fieldType={ruleNameData.data.type}
            fieldFormat={ruleNameData.data.format}
            isDraggable={false}
            truncate={false}
          />
        </OverviewCardWithActions>
      </EuiFlexItem>
    ) : null;

    const { width, ref } = useThrottledResizeObserver();

    // 675px is the container width at which none of the cards, when hovered,
    // creates a visual overflow in a single row setup
    const showAsSingleRow = width === 0 || width >= 675;

    // Only render cards with content
    const cards = [signalCard, severityCard, riskScoreCard, ruleNameCard].filter(isNotNull);

    // If there is enough space, render a single row.
    // Otherwise, render two rows with each two cards.
    const content = showAsSingleRow ? (
      <NotGrowingFlexGroup gutterSize="s">{cards}</NotGrowingFlexGroup>
    ) : (
      <>
        {chunk(2, cards).map((elements, index, { length }) => {
          // Add a spacer between rows but not after the last row
          const addSpacer = index < length - 1;
          return (
            <>
              <NotGrowingFlexGroup gutterSize="s">{elements}</NotGrowingFlexGroup>
              {addSpacer && <EuiSpacer size="s" />}
            </>
          );
        })}
      </>
    );

    return <div ref={ref}>{content}</div>;
  }
);

function hasData(fieldInfo?: EnrichedFieldInfo): fieldInfo is EnrichedFieldInfoWithValues {
  return !!fieldInfo && Array.isArray(fieldInfo.values);
}

Overview.displayName = 'Overview';
