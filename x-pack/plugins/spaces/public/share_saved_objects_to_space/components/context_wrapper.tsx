/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, PropsWithChildren } from 'react';
import { StartServicesAccessor, CoreStart } from 'src/core/public';
import { createKibanaReactContext } from '../../../../../../src/plugins/kibana_react/public';
import { PluginsStart } from '../../plugin';

interface Props {
  getStartServices: StartServicesAccessor<PluginsStart>;
}

export const ContextWrapper = (props: PropsWithChildren<Props>) => {
  const { getStartServices, children } = props;

  const [coreStart, setCoreStart] = useState<CoreStart>();

  useEffect(() => {
    getStartServices().then((startServices) => {
      const [coreStartValue] = startServices;
      setCoreStart(coreStartValue);
    });
  }, [getStartServices]);

  if (!coreStart) {
    return null;
  }

  const { application, docLinks } = coreStart;
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    application,
    docLinks,
  });

  return <KibanaReactContextProvider>{children}</KibanaReactContextProvider>;
};
