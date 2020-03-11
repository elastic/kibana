/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiNotificationBadge } from '@elastic/eui';
import useMountedState from 'react-use/lib/useMountedState';
import { EmbeddableContext } from '../../../../../../../../src/plugins/embeddable/public';
import { txtDisplayName } from './i18n';

export const MenuItem: React.FC<{ context: EmbeddableContext }> = ({ context }) => {
  const isMounted = useMountedState();
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!context.embeddable.dynamicActions) return;
    context.embeddable.dynamicActions.count().then(result => {
      if (!isMounted()) return;
      setCount(result);
    });
  }, [context.embeddable.dynamicActions, isMounted]);

  const badge = !count ? null : (
    <EuiNotificationBadge style={{ float: 'right' }}>{count}</EuiNotificationBadge>
  );

  return (
    <>
      {txtDisplayName} {badge}
    </>
  );
};
