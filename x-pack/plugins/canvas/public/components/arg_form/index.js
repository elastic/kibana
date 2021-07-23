/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { getAssets } from '../../state/selectors/assets';
import { getWorkpadInfo } from '../../state/selectors/workpad';
import { ArgForm as Component } from './arg_form';

const getLabel = (label, argTypeInstance) =>
  label || argTypeInstance.displayName || argTypeInstance.name;

const ArgFormComponent = (props) => {
  const { argTypeInstance, label: labelFromProps, templateProps } = props;
  const [label, setLabel] = useState(getLabel(labelFromProps, argTypeInstance));
  const [resolvedArgValue, setResolvedArgValue] = useState(null);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    setRenderError(false);
    setResolvedArgValue();
  }, [templateProps?.argValue]);

  return (
    <Component
      {...props}
      label={label}
      setLabel={setLabel}
      resolvedArgValue={resolvedArgValue}
      setResolvedArgValue={setResolvedArgValue}
      renderError={renderError}
      setRenderError={setRenderError}
    />
  );
};

export const ArgForm = connect((state) => ({
  workpad: getWorkpadInfo(state),
  assets: getAssets(state),
}))(ArgFormComponent);

ArgForm.propTypes = {
  label: PropTypes.string,
  argTypeInstance: PropTypes.shape({
    name: PropTypes.string.isRequired,
    displayName: PropTypes.string,
    expanded: PropTypes.bool,
  }).isRequired,
};
