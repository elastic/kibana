/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withProps, withPropsOnChange } from 'recompose';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import { notify } from '../../lib/notify';
import { RenderWithFn as Component } from './render_with_fn';
import { ElementHandlers } from './lib/handlers';

export const RenderWithFn = compose(
  withPropsOnChange(
    // rebuild elementHandlers when handlers object changes
    (props, nextProps) => !isEqual(props.handlers, nextProps.handlers),
    ({ handlers }) => ({
      handlers: Object.assign(new ElementHandlers(), handlers),
    })
  ),
  withProps({
    onError: notify.error,
  })
)(Component);

RenderWithFn.propTypes = {
  handlers: PropTypes.object,
};
