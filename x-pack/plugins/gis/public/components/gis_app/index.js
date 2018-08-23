/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { GISApp } from './view';

const connectedGISApp = connect(null)(GISApp);
export { connectedGISApp as GISApp };
