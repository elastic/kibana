/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux';

import { TGridProps } from '../types';
import { TGridIntegrated } from './t_grid/integrated';

export const TGrid = (props: TGridProps) => {
  // const reduxStuff = getReduxDeps(props.type);
  // const dispatch = useDispatch();
  const currentTime = useSelector((state) => state);
  console.log(currentTime);
  const { type, ...componentsProps } = props;
  // const testActionHandler = useCallback(
  //   () =>
  //     dispatch(
  //       actions.setEventsLoading({
  //         id: TimelineId.test,
  //         eventIds: [`${Math.random()}`],
  //         isLoading: false,
  //       })
  //     ),
  //   [dispatch]
  // );

  if (props.type === 'standalone') {
    return (
      <div data-test-subj="timeline-wrapper">
        {/* <EuiButton onClick={testActionHandler}>{'whatever'}</EuiButton> */}
        <h1>{'current time: '}</h1>
      </div>
    );
  } else {
    return <TGridIntegrated {...componentsProps} />;
  }
};

// eslint-disable-next-line import/no-default-export
export { TGrid as default };
