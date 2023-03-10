/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { EuiCard, EuiFlexItem, EuiIcon, EuiStat, EuiText, EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EngineAnalyticsLens,
  filterBy,
  lensDataOutputProps,
} from './engines_lens/engine_analytics_lens';
import { TimeRange } from '@kbn/es-query';
import { useValues } from 'kea';
import { EngineAnalyticsLogic } from './engine_analytics_logic';

export const getIcon = (percentage: number): string => {
  return percentage >= 0 ? 'sortUp' : 'sortDown';
};

interface EngineAnalyticsCardProps extends lensDataOutputProps {
  cardDisplay: 'success' | undefined;
  cardTitle: string;
  onClick: () => void;
  percentage: number;
  queries: number;
  timeRange: TimeRange;
}
export const EngineAnalyticsCard: React.FC<EngineAnalyticsCardProps> = ({
  cardDisplay,
  cardTitle,
  onClick,
  percentage,
  queries,
}) => {
  return (
    <EuiFlexItem>
      <EuiCard
        textAlign="left"
        title={
          <EuiText size="m">
            <FormattedMessage
              id="xpack.enterpriseSearch.content.engine.overview.analytics.totalQueries.card.title"
              defaultMessage="{title}"
              values={{
                title: cardTitle,
              }}
            />
          </EuiText>
        }
        layout="vertical"
        onClick={onClick}
        display={cardDisplay}
        hasBorder
      >
        <EuiStat
          title={queries.toLocaleString()}
          titleSize="l"
          description={
            <EuiTextColor color="success">
              <EuiIcon size="m" type={getIcon(percentage)} />
              <span>{Math.abs(Math.round(percentage)).toLocaleString()} %</span>
            </EuiTextColor>
          }
          reverse
          titleColor="success"
        />
      </EuiCard>
    </EuiFlexItem>
  );
};
