/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EntityDefinitionWithState } from '@kbn/entities-schema';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiStat, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { TransformHealthBadge } from './transform_health_badge';
import { TransformStatusBadge } from './transform_status_badge';
import { TransformContent } from './transform_content';

interface TransformProps {
  type: 'history' | 'latest';
  definition: EntityDefinitionWithState;
}

const LATEST_TITLE = i18n.translate('xpack.entityManager.transfrom.latestTitle', {
  defaultMessage: 'Latest transform',
});

const HISTORY_TITLE = i18n.translate('xpack.entityManager.transfrom.historyTitle', {
  defaultMessage: 'History transform',
});

export function Transform({ definition, type }: TransformProps) {
  const title = type === 'history' ? HISTORY_TITLE : LATEST_TITLE;
  const transform = definition.resources.transforms[type];
  const stats = definition.resources.transforms.stats[type];

  if (!transform || !stats) return null;

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem grow={0}>
              <TransformHealthBadge healthStatus={stats.health?.status ?? 'unknown'} />
            </EuiFlexItem>
            <EuiFlexItem grow={0}>
              <TransformStatusBadge status={stats.state} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <EuiStat
            titleSize="s"
            title={
              numeral(stats.stats.index_failures / stats.stats.index_total).format('0,0[.0]') + '%'
            }
            textAlign="right"
            description={i18n.translate('xpack.entityManager.transform.indexFailureLabel', {
              defaultMessage: 'Index Failures',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <EuiStat
            titleSize="s"
            title={
              numeral(stats.stats.search_failures / stats.stats.search_total).format('0,0[.0]') +
              '%'
            }
            textAlign="right"
            description={i18n.translate('xpack.entityManager.transform.searcFailureRateLabel', {
              defaultMessage: 'Search Failures',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <EuiStat
            titleSize="s"
            title={numeral(stats.stats.exponential_avg_checkpoint_duration_ms).format('0,0') + 'ms'}
            textAlign="right"
            description={i18n.translate(
              'xpack.entityManager.transform.avgCheckpointDurationLabel',
              { defaultMessage: 'Average Duration' }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <TransformContent transform={transform} stats={stats} />
    </EuiPanel>
  );
}
