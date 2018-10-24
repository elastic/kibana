/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import {
  EuiIcon
} from '@elastic/eui';

//import { EuiIcon } from '../../icon';

export const VisibilityToggle = ({
  id,
  name,
  checked,
  disabled,
  onChange,
  children,
  className
}) => {
  const classes = classNames('visibilityToggle', className);

  return (
    <div className={classes}>
      <input
        className="euiSwitch__input"
        name={name}
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />

      <span className="visibilityToggle__body">
        <span className="visibilityToggle__eye" >
          <EuiIcon
            type={'eye'}
          />
        </span>
        <span className="visibilityToggle__eyeClosed" >
          <EuiIcon
            type={'eyeClosed'}
          />
        </span>
        <span className="visibilityToggle__content">
          {children}
        </span>
      </span>
    </div>
  );
};

VisibilityToggle.propTypes = {
  name: PropTypes.string,
  id: PropTypes.string,
  label: PropTypes.node,
  checked: PropTypes.bool,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  children: PropTypes.element.isRequired,
};
