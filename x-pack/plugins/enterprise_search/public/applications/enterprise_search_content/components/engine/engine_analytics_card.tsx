/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiCard, EuiFlexItem, EuiIcon, EuiStat, EuiText, EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { EngineAnalyticsLogic, titles } from './engine_analytics_logic';

const getIcon = (percentage: number): string => {
  return percentage >= 0 ? 'sortUp' : 'sortDown';
};

interface EngineAnalyticsCardProps {
  cardDisplay: 'success' | undefined;
  isQueriesCard: boolean;
  onClick: () => void;
}
export const EngineAnalyticsCard: React.FC<EngineAnalyticsCardProps> = ({
  cardDisplay,
  isQueriesCard,
  onClick,
}) => {
  const { queriesCount, queriesCountPercentage, noResults, noResultsPercentage } =
    useValues(EngineAnalyticsLogic);
  const queries = isQueriesCard ? queriesCount : noResults;
  const percentage = isQueriesCard ? queriesCountPercentage : noResultsPercentage;

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
                title: isQueriesCard ? titles.cardQueries : titles.cardNoResults,
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
