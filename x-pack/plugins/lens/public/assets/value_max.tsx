/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const ValueMaxIcon = (props: Omit<EuiIconProps, 'type'>) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M0 .5A.5.5 0 0 1 .5 0h1a.5.5 0 0 1 .5.5V14h13.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0V15H9v.5a.5.5 0 0 1-1 0V15H2v.5a.5.5 0 0 1-1 0V15H.5a.5.5 0 0 1 0-1H1V8H.5a.5.5 0 0 1 0-1H1V1H.5A.5.5 0 0 1 0 .5ZM11 2.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM11.452 4.062c.223-.278.387-.605.475-.961.155.155.3.323.437.498.706.909 1.228 2.095 1.61 3.243.385 1.154.64 2.303.799 3.16a25.931 25.931 0 0 1 .22 1.413l.003.022v.007l-.496.056.497-.056a.5.5 0 0 1-.994.111v-.005L14 11.533a24.694 24.694 0 0 0-.21-1.348c-.155-.83-.4-1.931-.765-3.027-.368-1.102-.846-2.166-1.452-2.945a5.087 5.087 0 0 0-.122-.15Z" />
    <path d="M7.073 3.1c.088.357.252.684.475.962a5.08 5.08 0 0 0-.122.151c-.606.78-1.084 1.843-1.452 2.945a23.086 23.086 0 0 0-.764 3.027A24.776 24.776 0 0 0 5 11.533l-.003.017v.005a.5.5 0 1 1-.994-.111l.497.056-.497-.056v-.002l.001-.005.002-.022a11.722 11.722 0 0 1 .05-.372c.036-.252.092-.61.171-1.04a24.08 24.08 0 0 1 .799-3.161c.382-1.148.904-2.334 1.61-3.243a5.55 5.55 0 0 1 .437-.498Z" />
  </svg>
);
