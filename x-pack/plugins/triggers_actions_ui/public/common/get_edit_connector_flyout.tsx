/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { lazy, Suspense } from 'react';
import type { ConnectorEditFlyoutProps } from '../application/sections/action_connector_form/connector_edit_flyout';

export const getEditConnectorFlyoutLazy = (props: ConnectorEditFlyoutProps) => {
  const ConnectorEditFlyoutLazy = lazy(
    () => import('../application/sections/action_connector_form/connector_edit_flyout')
  );
  return (
    <Suspense fallback={null}>
      <ConnectorEditFlyoutLazy {...props} />
    </Suspense>
  );
};
