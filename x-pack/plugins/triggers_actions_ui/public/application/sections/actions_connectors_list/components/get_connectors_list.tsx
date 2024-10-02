/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateConnectorFlyoutProps } from '../../action_connector_form/create_connector_flyout';
import { ConnectorServices } from '../../../../types';
import { ConnectorProvider } from '../../../context/connector_context';
import { LazyConnectorList } from '../../action_connector_form';

export const getConnectorsList = (
  props: CreateConnectorFlyoutProps & { connectorServices: ConnectorServices }
) => {
  return (
    <ConnectorProvider value={{ services: props.connectorServices }}>
      <LazyConnectorList {...props} />
    </ConnectorProvider>
  );
};
//
// export const LazyConnectorList = suspendedComponentWithProps(
//   lazy(() => import('./actions_connectors_list'))
// );
