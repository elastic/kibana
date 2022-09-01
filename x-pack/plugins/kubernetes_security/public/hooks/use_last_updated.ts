/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { StartPlugins } from '../types';

export const useLastUpdated = (updatedAt: number | undefined) => {
  const { timelines: timelinesUi } = useKibana<CoreStart & StartPlugins>().services;

  return timelinesUi.getLastUpdated({
    updatedAt: updatedAt || Date.now(),
  });
};
