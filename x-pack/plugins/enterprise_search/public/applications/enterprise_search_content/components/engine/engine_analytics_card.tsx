/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiCard,
  EuiFlexItem,
  EuiIcon,
  EuiStat,
  EuiText,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { getIcon } from './engines_lens/lens_data';

interface EngineAnalyticsCardProps {
  cardDisplay: 'success' | undefined;
  cardTitle: string;
  onClick: () => void;
  percentage: number;
  queries: number;
}
export const EngineAnalyticsCard: React.FC<EngineAnalyticsCardProps> = ({
  cardDisplay,
  cardTitle,
  onClick,
  percentage,
  queries,
}) => {
  const {
    euiTheme: { colors: colors },
  } = useEuiTheme();

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
            <EuiTextColor color={colors.successText}>
              <EuiIcon size="m" type={getIcon(percentage)} />
              <span>{Math.abs(Math.round(percentage)).toLocaleString()} %</span>
            </EuiTextColor>
          }
          reverse
          titleColor={colors.successText}
        />
      </EuiCard>
    </EuiFlexItem>
  );
};
