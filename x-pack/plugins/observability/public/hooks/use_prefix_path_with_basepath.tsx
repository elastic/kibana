/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export const usePrefixPathWithBasepath = () => {
  const getUrlForApp = useKibana().services.application?.getUrlForApp;
  const prefixer = useMemo(() => {
    if (!getUrlForApp) {
      throw new Error('Application core service is unavailable');
    }

    return (app: string, path: string) => {
      return getUrlForApp(app, { path });
    };
  }, [getUrlForApp]);
  return prefixer;
};
