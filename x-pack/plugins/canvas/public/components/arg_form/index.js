/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose, withState, lifecycle } from 'recompose';
import { getAssets } from '../../state/selectors/assets';
import { getWorkpadInfo } from '../../state/selectors/workpad';
import { ArgForm as Component } from './arg_form';

export const ArgForm = compose(
  withState('label', 'setLabel', ({ label, argTypeInstance }) => {
    return label || argTypeInstance.displayName || argTypeInstance.name;
  }),
  withState('resolvedArgValue', 'setResolvedArgValue'),
  withState('renderError', 'setRenderError', false),
  lifecycle({
    componentDidUpdate(prevProps) {
      if (prevProps.templateProps.argValue !== this.props.templateProps.argValue) {
        this.props.setRenderError(false);
        this.props.setResolvedArgValue();
      }
    },
  }),
  connect(state => ({ workpad: getWorkpadInfo(state), assets: getAssets(state) }))
)(Component);

ArgForm.propTypes = {
  label: PropTypes.string,
  argTypeInstance: PropTypes.shape({
    name: PropTypes.string.isRequired,
    displayName: PropTypes.string,
    expanded: PropTypes.bool,
  }).isRequired,
};
