/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withState, lifecycle } from 'recompose';
import { TimePicker as Component } from './time_picker';

export const TimePicker = compose(
  withState('range', 'setRange', ({ from, to }) => ({ from, to })),
  withState('dirty', 'setDirty', false),
  lifecycle({
    componentWillReceiveProps({ from, to }) {
      if (from !== this.props.from || to !== this.props.to) {
        this.props.setRange({ from, to });
        this.props.setDirty(false);
      }
    },
  })
)(Component);
