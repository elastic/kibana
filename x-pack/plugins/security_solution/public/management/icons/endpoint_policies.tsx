/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconEndpointPolicies: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    fill="none"
    viewBox="0 0 32 32"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16 28.0001H14V19.5081L14.6 19.2461C17.88 17.8121 20 14.5751 20 11.0001C20 7.96306 18.471 5.17106 16 3.52106V11.0001H6V3.52106C3.529 5.17106 2 7.96306 2 11.0001C2 14.5751 4.12 17.8121 7.4 19.2461L8 19.5081V28.0001H6V20.7951C2.334 18.9241 0 15.1481 0 11.0001C0 6.63006 2.591 2.67406 6.6 0.922059L8 0.310059V9.00006H14V0.310059L15.4 0.922059C19.409 2.67406 22 6.63006 22 11.0001C22 15.1481 19.666 18.9241 16 20.7951V28.0001Z"
      fill="#535766"
    />
  </svg>
);
