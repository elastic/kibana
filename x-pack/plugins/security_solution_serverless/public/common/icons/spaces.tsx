/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconSpaces: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g id="Group">
      <path
        id="Stroke 1"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1 1V15H15V1H1ZM13 13H3V3H13V13Z"
        fill="#535766"
      />
      <path id="Stroke 3" d="M5 7V5H11V7H5Z" fill="#00BFB3" />
      <path
        id="Stroke 4"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17 1V15H31V1H17ZM29 13H19V3H29V13Z"
        fill="#535766"
      />
      <path id="Stroke 6" d="M21 7V5H27V7H21Z" fill="#00BFB3" />
      <path
        id="Stroke 7"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1 17V31H15V17H1ZM13 29H3V19H13V29Z"
        fill="#535766"
      />
      <path id="Stroke 9" d="M5 23V21H11V23H5Z" fill="#00BFB3" />
      <path
        id="Stroke 10"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17 17V31H31V17H17ZM29 29H19V19H29V29Z"
        fill="#535766"
      />
      <path id="Stroke 12" d="M21 23V21H27V23H21Z" fill="#00BFB3" />
    </g>
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default IconSpaces;
