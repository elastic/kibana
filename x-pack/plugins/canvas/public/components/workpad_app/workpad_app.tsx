/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEventHandler, useCallback } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
// @ts-expect-error untyped local
import { selectToplevelNodes } from '../../state/actions/transient';
import { canUserWrite } from '../../state/selectors/app';
import { getWorkpad, isWriteable } from '../../state/selectors/workpad';
import { WorkpadApp as Component } from './workpad_app.component';
import { withElementsLoadedTelemetry } from './workpad_telemetry';
import { State } from '../../../types';

export { WORKPAD_CONTAINER_ID } from './workpad_app.component';

const WorkpadAppComponent = withElementsLoadedTelemetry(Component);

export const WorkpadApp: React.FC = () => {
  const isWriteableProp = useSelector(
    (state: State) => isWriteable(state) && canUserWrite(state),
    shallowEqual
  );

  const workpad = useSelector((state: State) => getWorkpad(state), shallowEqual);
  const dispatch = useDispatch();

  const deselectElement: MouseEventHandler = useCallback(
    (ev) => {
      ev.stopPropagation();
      dispatch(selectToplevelNodes([]));
    },
    [dispatch]
  );

  return (
    <WorkpadAppComponent
      workpad={workpad}
      isWriteable={isWriteableProp}
      deselectElement={deselectElement}
    />
  );
};
