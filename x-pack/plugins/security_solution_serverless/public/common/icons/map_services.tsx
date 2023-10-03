/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconMapServices: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M3 22H6V24H1V1H24V6H22V3H3V22Z" fill="#00BFB3" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M31 31V8H8V31H31ZM10 29V10H29V29H10Z"
      fill="#535766"
    />
    <path
      d="M30.8227 21.1314L29.1773 22.2683C25.3207 16.6863 18.6562 14.1699 16.5129 17.6167C15.6822 18.9527 15.8443 19.9862 16.9432 22.2789C16.9911 22.3787 16.9911 22.3787 17.0395 22.4794C18.7858 26.1116 18.9092 28.0826 16.3826 30.6952L14.9449 29.3048C16.7327 27.4562 16.6607 26.3072 15.237 23.346C15.1885 23.2451 15.1885 23.2451 15.1397 23.1433C13.771 20.2879 13.5144 18.6515 14.8145 16.5606C18.0019 11.4346 26.2837 14.5616 30.8227 21.1314Z"
      fill="#535766"
    />
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default IconMapServices;
