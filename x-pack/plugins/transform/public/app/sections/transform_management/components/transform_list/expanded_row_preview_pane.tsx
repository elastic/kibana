/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, FC } from 'react';

import { DataGrid } from '../../../../../shared_imports';

import { useToastNotifications } from '../../../../app_dependencies';
import { getPivotQuery, TransformPivotConfig } from '../../../../common';
import { usePivotData } from '../../../../hooks/use_pivot_data';
import { SearchItems } from '../../../../hooks/use_search_items';

import {
  applyTransformConfigToDefineState,
  getDefaultStepDefineState,
} from '../../../create_transform/components/step_define/';

interface ExpandedRowPreviewPaneProps {
  transformConfig: TransformPivotConfig;
}

export const ExpandedRowPreviewPane: FC<ExpandedRowPreviewPaneProps> = ({ transformConfig }) => {
  const toastNotifications = useToastNotifications();

  const { aggList, groupByList, searchQuery } = useMemo(
    () =>
      applyTransformConfigToDefineState(
        getDefaultStepDefineState({} as SearchItems),
        transformConfig
      ),
    [transformConfig]
  );

  const pivotQuery = useMemo(() => getPivotQuery(searchQuery), [searchQuery]);

  const indexPatternTitle = Array.isArray(transformConfig.source.index)
    ? transformConfig.source.index.join(',')
    : transformConfig.source.index;

  const pivotPreviewProps = usePivotData(indexPatternTitle, pivotQuery, aggList, groupByList);

  return (
    <DataGrid
      {...pivotPreviewProps}
      dataTestSubj="transformPivotPreview"
      toastNotifications={toastNotifications}
    />
  );
};
