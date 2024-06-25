/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconChartArrow: React.FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M31.4185 4.11481L20.4558 15.0775L12.5084 7.13003L1.61832 18.0201L0.204102 16.6059L12.5084 4.3016L20.4558 12.249L30.0043 2.7006L31.4185 4.11481Z"
      fill="#00BFB3"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3.01855 31V22H5.01855V31H3.01855Z"
      fill="#535966"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M19.0186 31V22H21.0186V31H19.0186Z"
      fill="#535966"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.0186 31V15H13.0186V31H11.0186Z"
      fill="#535966"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M27.0186 31V15H29.0186V31H27.0186Z"
      fill="#535966"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M29.9998 4.05764L24.9883 3.99993L25.0113 2.00006L31.9998 2.08054V9H29.9998V4.05764Z"
      fill="#535966"
    />
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default IconChartArrow;
