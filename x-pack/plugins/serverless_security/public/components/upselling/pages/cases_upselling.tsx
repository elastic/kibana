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
          <br />
          <br />
          <iframe
            title="money"
            src="https://giphy.com/embed/px8O7NANzzaqk"
            width="480"
            height="283"
            frameBorder="0"
            className="giphy-embed"
            allowFullScreen
          />
        </>
      }
      actions={<EuiLink href="#">Purchase Endpoint Complete</EuiLink>}
    />
  );
});
