/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiText, EuiTextArea } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const HostIsolationContent = React.memo(() => {
  return (
    <>
      <EuiTitle>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.hostIsolation.isolateHost"
          defaultMessage="Isolate Host"
        />
      </EuiTitle>
      <EuiText>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.hostIsolation.isolateThisHost"
          defaultMessage="Endpoint Name is currently not isolated. Are you sure you want to isolate this host?"
        />
      </EuiText>
      <EuiTextArea
        data-test-subj="host_isolation_comment"
        resize="none"
        placeholder="You may leave an optional note here"
        value={}
        onChange={}
      />
    </>
  );
});

HostIsolationContent.displayName = 'HostIsolationContent';
