/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiLink } from '@elastic/eui';

export const CasesUpselling: React.FC = React.memo(() => {
  return (
    <EuiEmptyPrompt
      iconType="logoSecurity"
      title={<>I am a Serverless upselling message.</>}
      body={
        <>
          Get <b>EndpointComplete</b> to use Cases
        </>
      }
      actions={<EuiLink href="#">Purchase Endpoint Complete</EuiLink>}
    />
  );
});
