/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import stringify from 'json-stable-stringify';
import React from 'react';
import type { State } from 'xstate';

export const InvalidStateCallout: React.FC<{ state: State<any, any, any, any, any> }> = ({
  state,
}) => (
  <EuiCallOut title={invalidStateCalloutTitle} color="danger" iconType="alert">
    <FormattedMessage
      id="xpack.infra.logs.common.invalidStateMessage"
      defaultMessage="Unable to handle state {stateValue}."
      values={{
        stateValue: stringify(state.value),
      }}
      tagName="pre"
    />
  </EuiCallOut>
);

const invalidStateCalloutTitle = i18n.translate(
  'xpack.infra.logs.common.invalidStateCalloutTitle',
  { defaultMessage: 'Invalid state encountered' }
);
