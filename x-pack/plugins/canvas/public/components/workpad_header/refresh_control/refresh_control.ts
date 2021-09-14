/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
// @ts-expect-error untyped local
import { fetchAllRenderables } from '../../../state/actions/elements';
import { getInFlight } from '../../../state/selectors/resolved_args';
import { State } from '../../../../types';
import { RefreshControl as Component } from './refresh_control.component';

const mapStateToProps = (state: State) => ({
  inFlight: getInFlight(state),
});

const mapDispatchToProps = {
  doRefresh: fetchAllRenderables,
};

export const RefreshControl = connect(mapStateToProps, mapDispatchToProps)(Component);
