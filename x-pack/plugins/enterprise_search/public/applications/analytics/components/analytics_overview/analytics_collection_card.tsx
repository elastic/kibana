/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent } from 'react';

import { parsePath } from 'history';
import { useValues } from 'kea';

import { AreaSeries, Chart, CurveType, ScaleType, Settings } from '@elastic/charts';
import {
  EuiBadge,
  EuiCard,
  EuiFlexGroup,
  EuiI18nNumber,
  EuiIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';

import { EuiThemeComputed } from '@elastic/eui/src/services/theme/types';

import { i18n } from '@kbn/i18n';

import { AnalyticsCollection } from '../../../../../common/types/analytics';

import { generateEncodedPath } from '../../../shared/encode_path_params';

import { KibanaLogic } from '../../../shared/kibana';
import { COLLECTION_VIEW_PATH } from '../../routes';

import { AnalyticsCollectionCardStyles } from './analytics_collection_card.styles';

import './analytics_collection_card.styles';

enum ChartStatus {
  INCREASE = 'increase',
  DECREASE = 'decrease',
  CONSTANT = 'constant',
}

const getCardTheme = (euiTheme: EuiThemeComputed) => ({
  [ChartStatus.DECREASE]: {
    area: '#F5A35C',
    areaOpacity: 0.2,
    icon: 'sortDown',
    line: '#DA8B45',
    lineOpacity: 0.5,
    text: '#996130',
  },
  [ChartStatus.CONSTANT]: {
    area: euiTheme.colors.mediumShade,
    areaOpacity: 0.2,
    icon: 'minus',
    line: euiTheme.colors.mediumShade,
    lineOpacity: 0.5,
    text: euiTheme.colors.darkShade,
  },
  [ChartStatus.INCREASE]: {
    area: '#6DCCB1',
    areaOpacity: 0.2,
    icon: 'sortUp',
    line: '#54b399',
    lineOpacity: 0.5,
    text: '#387765',
  },
});

interface AnalyticsCollectionCardProps {
  collection: AnalyticsCollection;
  data: Array<[x: number, y: number]>;
  isCreatedByEngine?: boolean;
  metric: number;
  secondaryMetric?: number;
  subtitle: string;
}

const getChartStatus = (metric?: number): ChartStatus => {
  if (metric && metric > 0) return ChartStatus.INCREASE;
  if (metric && metric < 0) return ChartStatus.DECREASE;
  return ChartStatus.CONSTANT;
};

export const AnalyticsCollectionCard: React.FC<AnalyticsCollectionCardProps> = ({
  collection,
  isCreatedByEngine,
  subtitle,
  data,
  metric,
  secondaryMetric,
  children,
}) => {
  const { euiTheme } = useEuiTheme();
  const { history, navigateToUrl } = useValues(KibanaLogic);
  const cardStyles = AnalyticsCollectionCardStyles(euiTheme);
  const status = getChartStatus(secondaryMetric);
  const CARD_THEME = getCardTheme(euiTheme)[status];
  const collectionViewUrl = generateEncodedPath(COLLECTION_VIEW_PATH, {
    id: collection.id,
    section: 'events',
  });

  return (
    <EuiCard
      titleSize="s"
      titleElement="h4"
      title={
        <>
          <span css={cardStyles.title}>{collection.name}</span>
          {isCreatedByEngine && (
            <EuiBadge color="hollow" iconType="link" css={cardStyles.badge}>
              {i18n.translate('xpack.enterpriseSearch.analytics.collection.badge', {
                defaultMessage: 'Engine',
              })}
            </EuiBadge>
          )}
        </>
      }
      textAlign="left"
      css={cardStyles.card}
      description={<span css={cardStyles.subtitle}>{subtitle}</span>}
      href={history.createHref(parsePath(collectionViewUrl))}
      onClick={(event: MouseEvent) => {
        event?.preventDefault();

        navigateToUrl(collectionViewUrl);
      }}
      footer={
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          alignItems="flexEnd"
          justifyContent="flexEnd"
          css={cardStyles.footer}
        >
          {secondaryMetric !== null && (
            <EuiText size="s" color={CARD_THEME.text}>
              <EuiIcon type={CARD_THEME.icon} />
              {secondaryMetric}%
            </EuiText>
          )}

          <EuiText color={CARD_THEME.text}>
            <h2>
              {metric !== null ? (
                <EuiI18nNumber value={metric} />
              ) : (
                i18n.translate('xpack.enterpriseSearch.analytics.collection.notAvailableLabel', {
                  defaultMessage: 'N/A',
                })
              )}
            </h2>
          </EuiText>
        </EuiFlexGroup>
      }
    >
      {!!data?.length && (
        <Chart size={['100%', 130]} css={cardStyles.chart}>
          <Settings
            theme={{
              areaSeriesStyle: {
                area: {
                  fill: CARD_THEME.area,
                  opacity: CARD_THEME.areaOpacity,
                },
                line: {
                  opacity: CARD_THEME.lineOpacity,
                  stroke: CARD_THEME.line,
                  strokeWidth: 2,
                },
              },
              chartMargins: { bottom: 0, left: 0, right: 0, top: 0 },
            }}
            showLegend={false}
            tooltip="none"
          />
          <AreaSeries
            id={collection.id}
            data={data}
            xAccessor={0}
            yAccessors={[1]}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Sqrt}
            curve={CurveType.CURVE_BASIS}
            yNice
          />
        </Chart>
      )}
      {children}
    </EuiCard>
  );
};
