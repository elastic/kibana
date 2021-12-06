/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const ValueMinIcon = (props: Omit<EuiIconProps, 'type'>) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M0 .5A.5.5 0 0 1 .5 0h1a.5.5 0 0 1 .5.5V14h13.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0V15H9v.5a.5.5 0 0 1-1 0V15H2v.5a.5.5 0 0 1-1 0V15H.5a.5.5 0 0 1 0-1H1V8H.5a.5.5 0 0 1 0-1H1V1H.5A.5.5 0 0 1 0 .5Z" />
    <path d="M11 10.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M11.452 8.938c.223.278.387.605.475.961.155-.155.3-.323.437-.498.706-.909 1.228-2.095 1.61-3.243.385-1.154.64-2.303.799-3.16a25.94 25.94 0 0 0 .22-1.413l.003-.022v-.007a.5.5 0 0 0-.993-.111v.005L14 1.467l-.01.072a24.732 24.732 0 0 1-.202 1.277c-.153.83-.398 1.93-.763 3.026-.368 1.102-.846 2.166-1.452 2.945a5.1 5.1 0 0 1-.122.15ZM14.5 1.5l.497.056L14.5 1.5ZM7.073 9.9c.088-.357.252-.684.475-.962a5.067 5.067 0 0 1-.122-.151c-.606-.78-1.084-1.843-1.452-2.945a23.087 23.087 0 0 1-.764-3.027A24.814 24.814 0 0 1 5 1.467l-.003-.017v-.005a.5.5 0 1 0-.994.111v.002l.001.005.002.022a11.038 11.038 0 0 0 .05.372c.036.252.092.61.171 1.04.159.858.414 2.007.799 3.161.382 1.148.904 2.334 1.61 3.243.137.175.282.343.437.498ZM4.5 1.5l-.497.056L4.5 1.5Z"
    />
  </svg>
);
