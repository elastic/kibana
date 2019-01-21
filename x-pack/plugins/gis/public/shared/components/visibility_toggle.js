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
  const classes = classNames('gisVisibilityToggle', className);

  return (
    <div className={classes}>
      <input
        className="gisVisibilityToggle__input"
        name={name}
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />

      <span className="gisVisibilityToggle__body">
        <span className="gisVisibilityToggle__eye" >
          <EuiIcon
            type={'eye'}
          />
        </span>
        <span className="gisVisibilityToggle__eyeClosed" >
          <EuiIcon
            type={'eyeClosed'}
          />
        </span>
        <span className="gisVisibilityToggle__content">
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
