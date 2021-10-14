/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBetaBadge, EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { TypedLensByValueInput } from '../../../../../../lens/public';
import { useSeriesStorage } from '../hooks/use_series_storage';
import { LastUpdated } from './last_updated';
import { ExpViewActionMenu } from '../components/action_menu';
import { useExpViewTimeRange } from '../hooks/use_time_range';

interface Props {
  lastUpdated?: number;
  lensAttributes: TypedLensByValueInput['attributes'] | null;
}

export function ExploratoryViewHeader({ lensAttributes, lastUpdated }: Props) {
  const { setLastRefresh } = useSeriesStorage();

  const timeRange = useExpViewTimeRange();

  return (
    <>
      <ExpViewActionMenu timeRange={timeRange} lensAttributes={lensAttributes} />
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <EuiText>
            <h2>
              {i18n.translate('xpack.observability.expView.heading.label', {
                defaultMessage: 'Explore data',
              })}{' '}
              <EuiBetaBadge
                style={{
                  verticalAlign: `middle`,
                }}
                label={i18n.translate('xpack.observability.expView.heading.experimental', {
                  defaultMessage: 'Experimental',
                })}
              />
            </h2>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LastUpdated lastUpdated={lastUpdated} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton iconType="refresh" onClick={() => setLastRefresh(Date.now())}>
            {REFRESH_LABEL}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

const REFRESH_LABEL = i18n.translate('xpack.observability.overview.exploratoryView.refresh', {
  defaultMessage: 'Refresh',
});
