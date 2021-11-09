/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { callApi } from '../../../../services/rest/callApi';
import type { FetchOptions } from '../../../../../common/fetch_options';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import type { CoreStart } from '../../../../../../../../src/core/public';

export function useCallApi() {
  const { services } = useKibana<CoreStart>();

  return useMemo(() => {
    return <T = void>(options: FetchOptions) => callApi<T>(services, options);
  }, [services]);
}
