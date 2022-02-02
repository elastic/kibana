/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CoreStart } from 'kibana/public';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { FetchOptions } from '../../../../../../apm/common/fetch_options';
import { callApi } from '../../../../services/rest/call_api';

export function useCallApi() {
  const services = useKibanaServices();

  return useMemo(() => {
    return <T = void>(options: FetchOptions) =>
      callApi<T>(services as CoreStart, options);
  }, [services]);
}
