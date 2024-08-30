/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { merge } from 'lodash';
import { Subject } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { ReactQueryClientProvider } from '../../../../../../../common/containers/query_client/query_client_provider';

function createKibanaServicesMock(overrides?: Partial<CoreStart>) {
  const baseMock = {
    data: {
      dataViews: {
        create: async () => {},
        get: async () => {},
      },
    },
    http: {
      get: async () => {},
      basePath: {
        get: () => '',
      },
    },
    notifications: {
      toasts: {
        addError: () => {},
        addSuccess: () => {},
        addWarning: () => {},
        remove: () => {},
      },
    },
    settings: {
      client: {
        get: () => {},
        get$: () => new Subject(),
        set: () => {},
      },
    },
    uiSettings: {},
  } as unknown as CoreStart;

  return merge(baseMock, overrides);
}

interface StorybookProvidersProps {
  children: React.ReactNode;
  kibanaServicesMock?: ReturnType<typeof createKibanaServicesMock>;
}

export function FinalReadOnlyStorybookProviders({
  children,
  kibanaServicesMock,
}: StorybookProvidersProps) {
  const KibanaReactContext = createKibanaReactContext(createKibanaServicesMock(kibanaServicesMock));

  return (
    <KibanaReactContext.Provider>
      <ReactQueryClientProvider>{children}</ReactQueryClientProvider>
    </KibanaReactContext.Provider>
  );
}
