/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconEndpoint: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
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
        id="Fill 1"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.74499 2.85648L15.1476 16.0026L14.8713 16.4933L7.7449 29.1484C5.89634 32.4299 1 31.078 1 27.3123V4.69299C1 0.927492 5.89616 -0.424721 7.74499 2.85648ZM3 27.3097C3 29.0366 5.17293 29.6366 6.0023 28.1643L12.8524 16.0001L6.00242 3.83547C5.17299 2.36345 3 2.96358 3 4.69043V27.3097Z"
        fill="#535766"
      />
      <path
        id="Shape"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.0122 31L17.6866 17H30.4824L29.5893 18.5093L23.903 28.1177C22.7586 29.9128 20.7657 31 18.6236 31H10.0122ZM22.1992 27.0709L26.975 19H18.8711L13.3893 29H18.6236C20.0841 29 21.4404 28.2602 22.1992 27.0709Z"
        fill="#535766"
      />
      <path
        id="Combined Shape"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.1368 14L10.0122 1H18.6234C20.7655 1 22.7585 2.08715 23.9028 3.88232L30.3239 14H27.9552L22.2153 4.9557C21.4402 3.73981 20.0839 3 18.6234 3H13.389L19.4175 14H17.1368Z"
        fill="#00BFB3"
      />
    </g>
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default IconEndpoint;
