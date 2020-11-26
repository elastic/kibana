/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

const BLACK_RGB = '#000';

interface CustomSourceIconProps {
  color?: string;
}

export const CustomSourceIcon: React.FC<CustomSourceIconProps> = ({ color = BLACK_RGB }) => (
  <svg
    className="euiIcon euiIcon--medium"
    width="52"
    height="52"
    viewBox="0 0 52 52"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ fill: color }}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M18 34H20.222C21.988 31.744 23 28.935 23 26C23 23.065 21.988 20.256 20.222 18H18C13.582 18 10 21.582 10 26C10 30.418 13.582 34 18 34Z"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M18 12.158C20.355 10.794 23.082 10 26 10C34.837 10 42 17.163 42 26C42 34.837 34.837 42 26 42C23.082 42 20.355 41.206 18 39.842C20.4228 38.4381 22.4459 36.4202 23.8515 34H23.848C25.1274 31.7962 25.898 29.2625 25.9906 26.5526C25.9936 26.4634 25.996 26.374 25.9975 26.2843C25.9992 26.1898 26 26.095 26 26C26 25.8613 25.9982 25.723 25.9947 25.5851C25.9937 25.5449 25.9925 25.5047 25.9912 25.4646C25.9013 22.7482 25.1301 20.2085 23.848 18H23.8515C22.4459 15.5798 20.4228 13.5619 18 12.158Z"
    />
  </svg>
);
