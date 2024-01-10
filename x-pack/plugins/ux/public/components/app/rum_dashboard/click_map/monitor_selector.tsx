/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { MonitorScreenshotEmbeddable } from '@kbn/synthetics-plugin/public';
import { PluginContext } from '../../../../context/plugin_context';
// import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
// import { useKibanaServices } from '../../../../hooks/use_kibana_services';

export function MonitorSelector() {
  const { coreStart } = useContext(PluginContext);
  // const { http } = useKibanaServices();
  // const basePath = http.basePath.get();
  // const {
  //   urlParams: { serviceName },
  // } = useLegacyUrlParams();

  return (
    <>
      <MonitorScreenshotEmbeddable coreStart={coreStart} />
    </>
  );
}
