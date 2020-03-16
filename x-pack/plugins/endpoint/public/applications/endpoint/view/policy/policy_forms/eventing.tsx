/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiTitle } from '@elastic/eui';
import { EventingCheckbox } from './eventing_checkbox';
import { OS, EventingFields } from '../../../types';

export const Eventing = React.memo(() => {
  return (
    <>
      <EuiTitle size="l">
        <h1 data-test-subj="eventingViewTitle">{'Windows Eventing'}</h1>
      </EuiTitle>
      <EventingCheckbox
        id={'eventingProcess'}
        name="Process"
        os={OS.windows}
        protectionField={EventingFields.process}
      />
      <EventingCheckbox
        id={'eventingNetwork'}
        name="Network"
        os={OS.windows}
        protectionField={EventingFields.network}
      />
    </>
  );
});
