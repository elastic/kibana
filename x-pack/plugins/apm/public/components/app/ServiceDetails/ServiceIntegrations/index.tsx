/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { getLicense } from 'x-pack/plugins/apm/public/store/reactReduxRequest/license';
import { IReduxState } from 'x-pack/plugins/apm/public/store/rootReducer';
import { ServiceIntegrationsView } from './view';

function mapStateToProps(state = {} as IReduxState) {
  const license = getLicense(state).data;
  return {
    mlAvailable:
      license.features && license.features.ml && license.features.ml.isAvailable
  };
}

const ServiceIntegrations = connect(mapStateToProps)(ServiceIntegrationsView);
export { ServiceIntegrations };
