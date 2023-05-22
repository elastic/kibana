/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip, EuiEmptyPrompt, EuiLink } from '@elastic/eui';
import { ServerlessSecurityPLIs } from '../../../../common/config';

export const PrebuiltRulesTooltipUpselling: React.FC = React.memo(({ children }) => {
  return (
    <EuiToolTip
      content={
        <>
          Get <b>Endpoint Complete</b> to load prebuilt rules and Timeline templates.
          <br />
          <EuiLink href="#">Purchase Endpoint Complete</EuiLink>
        </>
      }
      repositionOnScroll={true}
      display="block"
    >
      {children as React.ReactElement}
    </EuiToolTip>
  );
});

export const RulesResponseActionsUpselling: React.FC<{ projectPLIs: ServerlessSecurityPLIs }> =
  React.memo(({ projectPLIs: projectPLIs }) => {
    const upsellingPLI = projectPLIs.includes('cloudEssentials')
      ? 'Cloud Complete'
      : 'Endpoint Complete';

    return (
      <EuiEmptyPrompt
        iconType="logoSecurity"
        title={<>This is a testing component for a Serverless upselling prompt.</>}
        body={
          <>
            Get <EuiLink href="#">{upsellingPLI}</EuiLink> to attach Response Actions to rules
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
  });
