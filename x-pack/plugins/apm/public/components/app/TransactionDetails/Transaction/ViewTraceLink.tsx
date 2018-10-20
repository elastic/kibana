/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { TransactionV2 } from '../../../../../typings/Transaction';
import { WaterfallResponse } from '../../../../../typings/waterfall';
import { getTraceLinkProps, KibanaLink } from '../../../../utils/url';

export function ViewTraceLink({ waterfall }: { waterfall: WaterfallResponse }) {
  if (!waterfall) {
    return null;
  }

  const root = waterfall.hits.find(
    hit => hit.version === 'v2' && !hit.parent
  ) as TransactionV2;

  if (!root || root.version !== 'v2') {
    return null;
  }

  const linkProps = getTraceLinkProps({ transactionDoc: root });

  if (!linkProps) {
    return null;
  }

  return (
    <KibanaLink pathname="/app/apm" {...linkProps}>
      <EuiButton iconType="apmApp">View full trace</EuiButton>
    </KibanaLink>
  );
}
