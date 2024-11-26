/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { StreamsAppKibanaContext } from '../../hooks/use_kibana';

export function StreamsAppContextProvider({
  context,
  children,
}: {
  context: StreamsAppKibanaContext;
  children: React.ReactNode;
}) {
  const servicesForContext = useMemo(() => {
    const { core, ...services } = context;
    return {
      ...core,
      ...services,
    };
  }, [context]);

  return <KibanaContextProvider services={servicesForContext}>{children}</KibanaContextProvider>;
}
