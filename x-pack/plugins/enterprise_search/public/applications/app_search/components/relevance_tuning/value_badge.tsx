/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import classNames from 'classnames';

import './value_badge.scss';

export const ValueBadge: React.FC<{ children: React.ReactNode; disabled?: boolean }> = ({
  children,
  disabled = false,
}) => {
  const className = classNames('valueBadge', {
    'valueBadge--disabled': disabled,
  });
  return <span className={className}>{children}</span>;
};
