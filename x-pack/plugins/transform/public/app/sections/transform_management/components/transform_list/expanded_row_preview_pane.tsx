/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { DataGrid } from '@kbn/ml-data-grid';

import { useToastNotifications } from '../../../../app_dependencies';
import { useTransformConfigData } from '../../../../hooks/use_transform_config_data';

export const ExpandedRowPreviewPane: FC = () => {
  const toastNotifications = useToastNotifications();
  const pivotPreviewProps = useTransformConfigData();

  return (
    <DataGrid
      {...pivotPreviewProps}
      dataTestSubj="transformPivotPreview"
      toastNotifications={toastNotifications}
    />
  );
};
