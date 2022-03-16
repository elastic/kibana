/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
interface SVGRProps {
  title?: string;
  titleId?: string;
}

const IconHexagon = ({ title, titleId, ...props }: React.SVGProps<SVGSVGElement> & SVGRProps) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      fillRule="evenodd"
      d="M8 1.122L1 4.688v6.924l7 3.566 7-3.566V4.688L8 1.122zm8 2.953L8 0 0 4.075v8.15L7.411 16h1.178L16 12.225v-8.15z"
    />
  </svg>
);

export const Hexagon = IconHexagon;
