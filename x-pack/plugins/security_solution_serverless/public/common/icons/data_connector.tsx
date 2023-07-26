/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconDataConnector: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
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
        id="Union"
        d="M13.4119 25.6592L6.34092 18.5879L8.57159 17.9904L14.0097 23.4285L21.4382 21.438L23.4287 14.0094L17.9907 8.57145L18.5884 6.34074L25.6594 13.4117L23.3701 21.9555L28.32 26.9053L28.0212 28.0206L26.9057 28.3195L21.956 23.3698L13.4119 25.6592Z"
        fill="#535766"
      />
      <path
        id="Union_2"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.5352 19.5357L14.7056 20.8298L11.17 17.2942L12.1653 13.5799L3.68008 5.0947L3.97898 3.9792L5.0942 3.68038L13.5796 12.1657L17.2938 11.1705L20.8293 14.706L19.5352 19.5357ZM18.5986 15.3038L17.9022 17.9027L15.3033 18.5991L13.4008 16.6965L14.0971 14.0976L16.696 13.4012L18.5986 15.3038Z"
        fill="#00BFB3"
      />
    </g>
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default IconDataConnector;
