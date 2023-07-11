/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconAuditbeat: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g>
      <g id="Group">
        <path id="Stroke 1" d="M15 1H17V31H15V1Z" fill="#00BFB3" />
        <path id="Stroke 3" d="M13 29V31H1V1H13V3H3V29H13Z" fill="#535766" />
        <path id="Stroke 5" d="M29 3H19V1H31V31H19V29H29V3Z" fill="#535766" />
      </g>
    </g>
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default IconAuditbeat;
