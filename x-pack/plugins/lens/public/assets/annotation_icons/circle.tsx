/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiIconProps } from '@elastic/eui';
import classnames from 'classnames';

export const IconCircle = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <circle
      strokeWidth="1"
      stroke="currentColor"
      cx="8"
      cy="8"
      className={classnames('lensAnnotationIconNoFill', props.className)}
      r="7"
    />
  </svg>
);
