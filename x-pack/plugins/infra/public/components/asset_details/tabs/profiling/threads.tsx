/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableStackTraces } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { TopNType } from '@kbn/profiling-utils';
import { HOST_FIELD } from '../../../../../common/constants';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDatePickerContext } from '../../hooks/use_date_picker';

export function Threads() {
  const { getDateRangeInTimestamp } = useDatePickerContext();
  const { from, to } = getDateRangeInTimestamp();
  const { asset } = useAssetDetailsRenderPropsContext();

  return (
    <EmbeddableStackTraces
      type={TopNType.Threads}
      rangeFrom={from}
      rangeTo={to}
      kuery={`${HOST_FIELD}:"${asset.name}"`}
    />
  );
}
