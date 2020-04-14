/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { getPivotQuery, TransformPivotConfig } from '../../../../common';
import { usePivotData, IndexPreview } from '../../../../components/index_preview';
import { SearchItems } from '../../../../hooks/use_search_items';

import {
  applyTransformConfigToDefineState,
  getDefaultStepDefineState,
} from '../../../create_transform/components/step_define/';

interface Props {
  transformConfig: TransformPivotConfig;
}

export const ExpandedRowPreviewPane: FC<Props> = ({ transformConfig }) => {
  const previewConfig = applyTransformConfigToDefineState(
    getDefaultStepDefineState({} as SearchItems),
    transformConfig
  );

  const { aggList, groupByList, searchQuery } = previewConfig;

  const pivotQuery = getPivotQuery(searchQuery);

  const indexPatternTitle = Array.isArray(transformConfig.source.index)
    ? transformConfig.source.index.join(',')
    : transformConfig.source.index;

  const pivotPreviewProps = usePivotData(indexPatternTitle, pivotQuery, aggList, groupByList);

  return <IndexPreview {...pivotPreviewProps} dataTestSubj="transformPivotPreview" />;
};
