/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { AlertParams, ErrorCountAlertTrigger } from '.';
import { CoreStart } from '../../../../../../../src/core/public';
import { createKibanaReactContext } from '../../../../../../../src/plugins/kibana_react/public';

const KibanaReactContext = createKibanaReactContext(({
  notifications: { toasts: { add: () => {} } },
} as unknown) as Partial<CoreStart>);

export default {
  title: 'alerting/ErrorCountAlertTrigger',
  component: ErrorCountAlertTrigger,
  decorators: [
    (Story: React.ComponentClass) => (
      <KibanaReactContext.Provider>
        <div style={{ width: 400 }}>
          <Story />
        </div>
      </KibanaReactContext.Provider>
    ),
  ],
};

export function Example() {
  const [params, setParams] = useState<AlertParams>({
    serviceName: 'testServiceName',
    environment: 'testEnvironment',
    threshold: 2,
    windowSize: 5,
    windowUnit: 'm',
  });

  function setAlertParams(property: string, value: any) {
    setParams({ ...params, [property]: value });
  }

  return (
    <ErrorCountAlertTrigger
      alertParams={params}
      setAlertParams={setAlertParams}
      setAlertProperty={() => {}}
    />
  );
}
