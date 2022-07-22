/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useAsync from 'react-use/lib/useAsync';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';
import { APM_STATIC_DATA_VIEW_ID } from '../../common/data_view_constants';

export function useStaticDataView() {
  const { dataViews } = useApmPluginContext();

  return useAsync(() => dataViews.get(APM_STATIC_DATA_VIEW_ID));
}
