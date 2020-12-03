/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { lazy, Suspense } from 'react';
import type { ConnectorAddFlyoutProps } from '../application/sections/action_connector_form/connector_add_flyout';

export const getAddConnectorFlyoutLazy = (props: ConnectorAddFlyoutProps) => {
  const ConnectorAddFlyoutLazy = lazy(
    () => import('../application/sections/action_connector_form/connector_add_flyout')
  );
  return (
    <Suspense fallback={null}>
      <ConnectorAddFlyoutLazy {...props} />
    </Suspense>
  );
};
