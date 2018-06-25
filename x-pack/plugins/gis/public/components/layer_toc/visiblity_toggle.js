/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

export function VisibilityToggle(props) {
  const onChange = (event) => {
    this.props.onChange(event.target.checked);
  };

  return (
    <div className="visibilityToggle">
      <input
        className="euiSwitch__input"
        type="checkbox"
        checked={props.checked}
        onChange={onChange}
      />
    </div>
  );
}
