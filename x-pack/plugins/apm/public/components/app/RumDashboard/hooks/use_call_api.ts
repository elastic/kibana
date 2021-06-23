/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { callApi } from '../../../../services/rest/callApi';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { FetchOptions } from '../../../../../common/fetch_options';

export function useCallApi() {
  const { core } = useApmPluginContext();

  return useMemo(() => {
    return <T = void>(options: FetchOptions) => callApi<T>(core, options);
  }, [core]);
}
