/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { TypedLensByValueInput } from '../../../../../../lens/public';
import { ExpViewActionMenu } from '../components/action_menu';
import { useExpViewTimeRange } from '../hooks/use_time_range';
import type { ChartTimeRange } from './last_updated';

interface Props {
  chartTimeRange?: ChartTimeRange;
  lensAttributes: TypedLensByValueInput['attributes'] | null;
}

export function ExploratoryViewHeader({ lensAttributes }: Props) {
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
              })}
            </h2>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
