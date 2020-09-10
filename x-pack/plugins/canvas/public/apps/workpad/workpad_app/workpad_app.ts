/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { MouseEventHandler } from 'react';
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
// @ts-expect-error untyped local
import { selectToplevelNodes } from '../../../state/actions/transient';
import { canUserWrite } from '../../../state/selectors/app';
import { getWorkpad, isWriteable } from '../../../state/selectors/workpad';
import { WorkpadApp as Component } from './workpad_app.component';
import { withElementsLoadedTelemetry } from './workpad_telemetry';
import { State } from '../../../../types';

export { WORKPAD_CONTAINER_ID } from './workpad_app.component';

const mapDispatchToProps = (dispatch: Dispatch): { deselectElement: MouseEventHandler } => ({
  deselectElement: (ev) => {
    ev.stopPropagation();
    dispatch(selectToplevelNodes([]));
  },
});

export const WorkpadApp = connect(
  (state: State) => ({
    isWriteable: isWriteable(state) && canUserWrite(state),
    workpad: getWorkpad(state),
  }),
  mapDispatchToProps
)(withElementsLoadedTelemetry(Component));
