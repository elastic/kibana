/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const SiemMigrationsIcon: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    fill="none"
    viewBox="0 0 32 32"
    {...props}
  >
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_2763_341531)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10 12C15.4292 12 19.8479 16.3267 19.9962 21.7201L20 22V23H11V32H10C4.47715 32 0 27.5228 0 22C0 16.4772 4.47715 12 10 12ZM9 21L9.00005 14.0619C5.05371 14.554 2 17.9204 2 22C2 25.9928 4.92513 29.3024 8.74934 29.9028L9 29.9381V21ZM11 21L11.0009 14.062L11.258 14.0983C14.7544 14.6506 17.4976 17.4677 17.9381 21H11Z"
          fill="#343741"
        />
        <path d="M26 22C26 13.1634 18.8366 6 10 6V8C17.732 8 24 14.268 24 22H26Z" fill="#007871" />
        <path
          d="M32 22C32 9.84974 22.1503 0 10 0V2C21.0457 2 30 10.9543 30 22H32Z"
          fill="#007871"
        />
      </g>
      <defs>
        <clipPath id="clip0_2763_341531">
          <rect width="32" height="32" fill="white" />
        </clipPath>
      </defs>
    </svg>
  </svg>
);
