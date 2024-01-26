/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconFleet: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g>
      <path
        id="Subtract"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.99581 18.6363L0 20.4337V26.5661L6 30.1661L11 27.1661L16 30.1661L21 27.1661L26 30.1661L32 26.5661V20.4337L27 17.4337V12.4337L22 9.43374V4.43374L16 0.83374L10 4.43374V7.26581L12 7.29946V5.56612L16 3.16612L20 5.56612V9.43374L18.0041 10.6313L19.0042 12.3636L21 11.1661L25 13.5661V17.4337L21 19.8337L18.7433 18.4797L17.772 20.2293L20 21.5661V25.4337L16 27.8337L12 25.4337V23.7342L10 23.7006V25.4337L6 27.8337L2 25.4337L2 21.5661L3.99595 20.3686L2.99581 18.6363ZM22 25.4337V21.5661L26 19.1661L30 21.5661V25.4337L26 27.8337L22 25.4337Z"
        fill="#535766"
      />
      <path
        id="Polygon 7 (Stroke)"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11 22.1662L5 18.5662L5 12.4338L11 8.83382L17 12.4338L17 18.5662L11 22.1662ZM15 17.4338L15 13.5662L11 11.1662L7 13.5662L7 17.4338L11 19.8338L15 17.4338Z"
        fill="#00BFB3"
      />
    </g>
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default IconFleet;
