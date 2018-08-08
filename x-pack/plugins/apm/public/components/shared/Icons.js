/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export function Icon({ name, className, ...props }) {
  return <i className={`fa ${name} ${className}`} {...props} />;
}

export function Ellipsis({ horizontal, style, ...props }) {
  return (
    <Icon
      style={{
        transition: 'transform 0.1s',
        transform: `rotate(${horizontal ? 90 : 0}deg)`,
        ...style
      }}
      name="fa-ellipsis-v"
      {...props}
    />
  );
}

export function Check({ ...props }) {
  return <Icon name="fa-check" {...props} />;
}

export function Close({ ...props }) {
  return <Icon name="fa-times" {...props} />;
}
