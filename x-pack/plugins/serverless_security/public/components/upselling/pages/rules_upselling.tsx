/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip, EuiLink } from '@elastic/eui';

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
