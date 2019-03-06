/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { getServiceDetails } from 'x-pack/plugins/apm/public/store/reactReduxRequest/serviceDetails';
import { IReduxState } from 'x-pack/plugins/apm/public/store/rootReducer';
import { selectIsMLAvailable } from 'x-pack/plugins/apm/public/store/selectors/license';
import { ServiceIntegrationsView } from './view';

function mapStateToProps(state = {} as IReduxState) {
  return {
    mlAvailable: selectIsMLAvailable(state),
    serviceDetails: getServiceDetails(state).data
  };
}

const ServiceIntegrations = connect(mapStateToProps)(ServiceIntegrationsView);
export { ServiceIntegrations };
