/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiLink } from '@elastic/eui';
import { ServerlessSecurityPLIs } from '../../../../common/config';

export const CasesUpselling: React.FC<{ projectPLIs: ServerlessSecurityPLIs }> = React.memo(
  ({ projectPLIs: projectPLIs }) => {
    const upsellingPLI = projectPLIs.includes('cloudEssentials')
      ? 'Cloud Complete'
      : 'Endpoint Complete';

    return (
      <EuiEmptyPrompt
        iconType="logoSecurity"
        title={<>This is a testing component for a Serverless upselling prompt.</>}
        body={
          <>
            Get <EuiLink href="#">{upsellingPLI}</EuiLink> to use Cases
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
      />
    );
  }
);
