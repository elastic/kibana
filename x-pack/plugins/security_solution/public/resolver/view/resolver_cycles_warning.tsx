/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import React from 'react';

export const ResolverCyclesCallOut = React.memo(({ cyclicalIds }: { cyclicalIds: string[] }) => (
  <EuiCallOut
    title="Cycles Detected"
    color="warning"
    iconType="help"
    data-test-subj="resolver:cycles-callout"
  >
    <p>
      {`The Analyzer has detected cycles in the tree associated with this event or alert. This means that a process node
      either references itself as it's parent or rreferences one of it's descendants as it's parent, creating an unexpected loop. The
      following ID's have been found to be the cause and are not displayed: [${cyclicalIds}]`}
    </p>
  </EuiCallOut>
));

ResolverCyclesCallOut.displayName = ' ResolverCyclesCallout';
