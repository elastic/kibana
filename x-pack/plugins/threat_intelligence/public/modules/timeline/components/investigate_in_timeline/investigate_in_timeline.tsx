/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, VFC } from 'react';
import moment from 'moment';
import { DataProvider, QueryOperator } from '@kbn/timelines-plugin/common';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { unwrapValue } from '../../../indicators/lib/unwrap_value';
import { SecuritySolutionContext } from '../../../../containers/security_solution_context';
import { IN_ICON_TEST_ID } from '../../../query_bar/components/filter_in_out';
import { getIndicatorFieldAndValue } from '../../../indicators/lib/field_value';
import {
  Indicator,
  IndicatorFieldEventEnrichmentMap,
  RawIndicatorFieldId,
} from '../../../../../common/types/indicator';
import { EMPTY_VALUE } from '../../../../../common/constants';
import { useStyles } from './styles';

export interface AddToTimelineProps {
  /**
   * Value passed to the timeline. Used in combination with field if is type of {@link Indicator}.
   */
  data: Indicator;
  /**
   * Used as `data-test-subj` value for e2e tests.
   */
  testId?: string;
}

/**
 * Investigate in timeline button, supports being passed a {@link Indicator}.
 * This implementation uses the InvestigateInTimelineAction component (x-pack/plugins/security_solution/public/detections/components/alerts_table/timeline_actions/investigate_in_timeline_action.tsx)
 * retrieved from the SecuritySolutionContext.
 *
 * @returns add to timeline button or an empty component.
 */
export const InvestigateInTimeline: VFC<AddToTimelineProps> = ({ data, testId }) => {
  const styles = useStyles();

  const securitySolutionContext = useContext(SecuritySolutionContext);

  const { key, value } = getIndicatorFieldAndValue(data, RawIndicatorFieldId.Name);

  if (!value || value === EMPTY_VALUE || !key) {
    return <></>;
  }

  const operator = ':' as QueryOperator;
  const dataProviders: DataProvider[] = [
    {
      and: [],
      enabled: true,
      id: `timeline-indicator-${key}-${value}`,
      name: value,
      excluded: false,
      kqlQuery: '',
      queryMatch: {
        field: key,
        value,
        operator,
      },
    },
  ];

  const eventEnrichments: string[] = IndicatorFieldEventEnrichmentMap[key];
  if (eventEnrichments) {
    eventEnrichments.forEach((eventEnrichment: string) => {
      dataProviders.push({
        and: [],
        enabled: true,
        id: `timeline-indicator-${eventEnrichment}-${value}`,
        name: eventEnrichment,
        excluded: false,
        kqlQuery: '',
        queryMatch: {
          field: eventEnrichment,
          value,
          operator,
        },
      });
    });
  }

  const to = unwrapValue(data, RawIndicatorFieldId.TimeStamp) as string;
  const from = moment(to).subtract(10, 'm').toISOString();

  const investigateInTimelineClick = securitySolutionContext?.getUseInvestigateInTimeline({
    dataProviders,
    from,
    to,
  });

  return (
    <div data-test-subj={testId} css={styles.inlineFlex}>
      <EuiButtonIcon
        data-test-subj={IN_ICON_TEST_ID}
        aria-label={i18n.translate(
          'xpack.threatIntelligence.indicator.table.investigateInTimelineButton',
          {
            defaultMessage: 'Investigate in Timeline',
          }
        )}
        iconType="timeline"
        iconSize="s"
        size="xs"
        color="primary"
        onClick={investigateInTimelineClick}
      />
    </div>
  );
};
