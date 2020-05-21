/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { useLocation } from 'react-router-dom';
import { EuiLink } from '@elastic/eui';

export const EndpointConfiguration = memo<{ editMode: boolean }>(({ editMode }) => {
  const pathname = useLocation().pathname.split('/');
  const policyId = pathname[pathname.length - 1];
  const linky = `/app/siem#/policy/${policyId}`;
  return (
    <>
      {editMode === true ? (
        <>
          <FormattedMessage
            id="xpack.ingestManager.editDatasource.stepConfigure.endpointConfiguration"
            defaultMessage="See security app policy tab for additional configuration options: "
          />
          <EuiLink href={linky}>Click me to configure</EuiLink>
        </>
      ) : (
        <FormattedMessage
          id="xpack.ingestManager.createDatasource.stepConfigure.endpointConfiguration"
          defaultMessage="See security app policy tab for additional configuration"
        />
      )}
    </>
  );
});
