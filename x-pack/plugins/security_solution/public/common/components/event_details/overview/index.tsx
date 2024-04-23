/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useMemo, Fragment } from 'react';
import { chunk, find } from 'lodash/fp';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import type { BrowserFields } from '../../../containers/source';
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
import { OverviewCardWithActions, OverviewCard } from './overview_card';
import { StatusPopoverButton } from './status_popover_button';
import { SeverityBadge } from '../../severity_badge';
import { useThrottledResizeObserver } from '../../utils';

export const NotGrowingFlexGroup = euiStyled(EuiFlexGroup)`
  flex-grow: 0;
`;

interface Props {
  browserFields: BrowserFields;
  contextId: string;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  handleOnEventClosed: () => void;
  scopeId: string;
  isReadOnly?: boolean;
}

export const Overview = React.memo<Props>(
  ({ browserFields, contextId, data, eventId, handleOnEventClosed, scopeId, isReadOnly }) => {
    const statusData = useMemo(() => {
      const item = find({ field: SIGNAL_STATUS_FIELD_NAME, category: 'kibana' }, data);
      return (
        item &&
        getEnrichedFieldInfo({
          eventId,
          contextId,
          scopeId,
          browserFields,
          item,
        })
      );
    }, [browserFields, contextId, data, eventId, scopeId]);

    const severityData = useMemo(() => {
      const item = find({ field: 'kibana.alert.severity', category: 'kibana' }, data);
      return (
        item &&
        getEnrichedFieldInfo({
          eventId,
          contextId,
          scopeId,
          browserFields,
          item,
        })
      );
    }, [browserFields, contextId, data, eventId, scopeId]);

    const riskScoreData = useMemo(() => {
      const item = find({ field: 'kibana.alert.risk_score', category: 'kibana' }, data);
      return (
        item &&
        getEnrichedFieldInfo({
          eventId,
          contextId,
          scopeId,
          browserFields,
          item,
        })
      );
    }, [browserFields, contextId, data, eventId, scopeId]);

    const ruleNameData = useMemo(() => {
      const item = find({ field: SIGNAL_RULE_NAME_FIELD_NAME, category: 'kibana' }, data);
      const linkValueField = find({ field: 'kibana.alert.rule.uuid', category: 'kibana' }, data);
      return (
        item &&
        getEnrichedFieldInfo({
          eventId,
          contextId,
          scopeId,
          browserFields,
          item,
          linkValueField,
        })
      );
    }, [browserFields, contextId, data, eventId, scopeId]);

    const signalCard =
      hasData(statusData) && !isReadOnly ? (
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
              scopeId={scopeId}
              handleOnEventClosed={handleOnEventClosed}
            />
          </OverviewCardWithActions>
        </EuiFlexItem>
      ) : null;

    const severityCard = hasData(severityData) ? (
      <EuiFlexItem key="severity">
        {!isReadOnly ? (
          <OverviewCardWithActions
            title={ALERTS_HEADERS_SEVERITY}
            enrichedFieldInfo={severityData}
            contextId={contextId}
          >
            <SeverityBadge value={severityData.values[0] as Severity} />
          </OverviewCardWithActions>
        ) : (
          <OverviewCard title={ALERTS_HEADERS_SEVERITY}>
            <SeverityBadge value={severityData.values[0] as Severity} />
          </OverviewCard>
        )}
      </EuiFlexItem>
    ) : null;

    const riskScoreCard = hasData(riskScoreData) ? (
      <EuiFlexItem key="riskScore">
        {!isReadOnly ? (
          <OverviewCardWithActions
            title={ALERTS_HEADERS_RISK_SCORE}
            enrichedFieldInfo={riskScoreData}
            contextId={contextId}
            dataTestSubj="riskScore"
          >
            {riskScoreData.values[0]}
          </OverviewCardWithActions>
        ) : (
          <OverviewCard title={ALERTS_HEADERS_RISK_SCORE}>{riskScoreData.values[0]}</OverviewCard>
        )}
      </EuiFlexItem>
    ) : null;

    const ruleNameCard =
      hasData(ruleNameData) && !isReadOnly ? (
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
    const showAsSingleRow = width === 0 || (width && width >= 675);

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
            <Fragment key={index}>
              <NotGrowingFlexGroup gutterSize="s">{elements}</NotGrowingFlexGroup>
              {addSpacer && <EuiSpacer size="s" />}
            </Fragment>
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

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

Overview.displayName = 'Overview';
