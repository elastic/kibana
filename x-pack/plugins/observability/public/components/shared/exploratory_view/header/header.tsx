/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TypedLensByValueInput } from '../../../../../../lens/public';
import { ExpViewActionMenu } from '../components/action_menu';
import { useExpViewTimeRange } from '../hooks/use_time_range';
import { LastUpdated } from './last_updated';
import type { ChartTimeRange } from './last_updated';

interface Props {
  chartTimeRange?: ChartTimeRange;
  lensAttributes: TypedLensByValueInput['attributes'] | null;
}

export function ExploratoryViewHeader({ lensAttributes, chartTimeRange }: Props) {
  const timeRange = useExpViewTimeRange();

  return (
    <>
      <ExpViewActionMenu timeRange={timeRange} lensAttributes={lensAttributes} />
      <LastUpdated chartTimeRange={chartTimeRange} />
    </>
  );
}
