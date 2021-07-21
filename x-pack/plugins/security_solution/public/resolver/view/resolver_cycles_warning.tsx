/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const ResolverCyclesCallOut = React.memo(({ cyclicalIds }: { cyclicalIds: string[] }) => (
  <EuiCallOut
    title="Cycles Detected"
    color="warning"
    iconType="help"
    data-test-subj="resolver:cycles-callout"
  >
    <p>
      {i18n.translate('xpack.securitySolution.resolver.cyclesDetected.message', {
        defaultMessage: `Some data may not be visible. The Analyzer has detected cycles in the data associated with this event or alert. This means that a process node
                         is referencing itself as it's parent, creating a cycle. The following process.entity_id values have been found
                         to be the cause.
                        `,
      })}
    </p>
    <p> {cyclicalIds.join(', ')} </p>
  </EuiCallOut>
));

ResolverCyclesCallOut.displayName = ' ResolverCyclesCallout';
