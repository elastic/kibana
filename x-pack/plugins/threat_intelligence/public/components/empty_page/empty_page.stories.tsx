/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { EmptyPage } from '.';

export default {
  component: BasicEmptyPage,
  title: 'EmptyPage',
};

export function BasicEmptyPage() {
  const KibanaReactContext = createKibanaReactContext({
    http: {
      basePath: {
        get: () => '',
      },
    },
    docLinks: {
      links: {
        securitySolution: {
          threatIntelInt: 'https://google.com',
        },
      },
    },
  } as unknown as Partial<CoreStart>);
  return (
    <KibanaReactContext.Provider>
      <EmptyPage />
    </KibanaReactContext.Provider>
  );
}
