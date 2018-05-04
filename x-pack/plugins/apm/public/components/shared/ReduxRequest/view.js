/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { ACTION_TYPES } from './reducer';

async function maybeFetchData(
  {
    args,
    dispatch,
    hasError,
    fn,
    hashedArgs,
    id,
    prevHashedArgs,
    shouldInvoke
  },
  ctx = {}
) {
  const shouldFetchData =
    shouldInvoke && prevHashedArgs !== hashedArgs && !hasError;

  if (!shouldFetchData) {
    return;
  }

  dispatch({
    id,
    hashedArgs,
    type: ACTION_TYPES.LOADING
  });
  const fetchId = (ctx.fetchId = _.uniqueId());
  try {
    const data = await fn(...args);
    if (fetchId === ctx.fetchId) {
      dispatch({
        data,
        hashedArgs,
        id,
        type: ACTION_TYPES.SUCCESS
      });
    }
  } catch (error) {
    if (fetchId === ctx.fetchId) {
      console.error(error);
      dispatch({
        error,
        hashedArgs,
        id,
        type: ACTION_TYPES.FAILURE
      });
    }
  }
}

export class ReduxRequestView extends React.Component {
  componentWillMount() {
    maybeFetchData(this.props, this);
  }

  componentWillReceiveProps(nextProps) {
    maybeFetchData(nextProps, this);
  }

  shouldComponentUpdate(nextProps) {
    return this.props.result !== nextProps.result;
  }

  componentWillUnmount() {
    this.fetchId = null;
  }

  render() {
    if (this.props.hasError) {
      return null;
    }

    const { status, data, error } = this.props.result;
    try {
      return this.props.render({ status, data, error });
    } catch (e) {
      console.error(
        `The render method of "ReduxRequest#${
          this.props.id
        }" threw an error:\n`,
        e
      );
      return null;
    }
  }
}

ReduxRequestView.propTypes = {
  args: PropTypes.array,
  dispatch: PropTypes.func.isRequired,
  fn: PropTypes.func.isRequired,
  hasError: PropTypes.bool,
  hashedArgs: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  prevHashedArgs: PropTypes.string,
  render: PropTypes.func,
  result: PropTypes.object,
  shouldInvoke: PropTypes.bool.isRequired
};

ReduxRequestView.defaultProps = {
  args: [],
  hasError: false,
  render: () => {},
  result: {},
  shouldInvoke: true
};
