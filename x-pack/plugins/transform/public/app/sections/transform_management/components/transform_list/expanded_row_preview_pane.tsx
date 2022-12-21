/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, FC } from 'react';

import { TransformConfigUnion } from '../../../../../../common/types/transform';

import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';
import { getPivotQuery } from '../../../../common';
import { usePivotData } from '../../../../hooks/use_pivot_data';
import { SearchItems } from '../../../../hooks/use_search_items';

import {
  applyTransformConfigToDefineState,
  getDefaultStepDefineState,
} from '../../../create_transform/components/step_define';

interface ExpandedRowPreviewPaneProps {
  transformConfig: TransformConfigUnion;
}

export const ExpandedRowPreviewPane: FC<ExpandedRowPreviewPaneProps> = ({ transformConfig }) => {
  const {
    ml: { DataGrid },
  } = useAppDependencies();
  const toastNotifications = useToastNotifications();

  const { searchQuery, validationStatus, previewRequest, runtimeMappings } = useMemo(
    () =>
      applyTransformConfigToDefineState(
        getDefaultStepDefineState({} as SearchItems),
        transformConfig
      ),
    [transformConfig]
  );

  const pivotQuery = useMemo(() => getPivotQuery(searchQuery), [searchQuery]);

  const dataViewTitle = Array.isArray(transformConfig.source.index)
    ? transformConfig.source.index.join(',')
    : transformConfig.source.index;

  const pivotPreviewProps = usePivotData(
    dataViewTitle,
    pivotQuery,
    validationStatus,
    previewRequest,
    runtimeMappings
  );

  return (
    <DataGrid
      {...pivotPreviewProps}
      dataTestSubj="transformPivotPreview"
      toastNotifications={toastNotifications}
    />
  );
};
