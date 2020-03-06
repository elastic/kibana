/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { SearchItems } from '../../../../hooks/use_search_items';

import { getPivotQuery, TransformPivotConfig } from '../../../../common';

import {
  applyTransformConfigToDefineState,
  getDefaultStepDefineState,
} from '../../../create_transform/components/step_define/';
import { PivotPreview } from '../../../../components/pivot_preview';

interface Props {
  transformConfig: TransformPivotConfig;
}

export const ExpandedRowPreviewPane: FC<Props> = ({ transformConfig }) => {
  const previewConfig = applyTransformConfigToDefineState(
    getDefaultStepDefineState({} as SearchItems),
    transformConfig
  );

  const indexPatternTitle = Array.isArray(transformConfig.source.index)
    ? transformConfig.source.index.join(',')
    : transformConfig.source.index;

  return (
    <PivotPreview
      aggs={previewConfig.aggList}
      groupBy={previewConfig.groupByList}
      indexPatternTitle={indexPatternTitle}
      query={getPivotQuery(previewConfig.searchQuery)}
      showHeader={false}
    />
  );
};
