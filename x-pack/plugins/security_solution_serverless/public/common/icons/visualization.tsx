/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconVisualization: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      id="Path"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M30 30H4C1.79086 30 0 28.2091 0 26V0H2V26C2 27.1046 2.89543 28 4 28H30V30Z"
      fill="#535766"
    />
    <rect id="Rectangle" x="6" y="19" width="2" height="7" fill="#535766" />
    <rect id="Rectangle_2" x="16" y="11" width="2" height="15" fill="#535766" />
    <rect id="Rectangle_3" x="26" y="16" width="2" height="10" fill="#535766" />
    <path
      id="Shape"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M24.92 5.84C25.4786 5.30157 26.2241 5.0005 27 5C28.6569 5 30 6.34315 30 8C30 9.65685 28.6569 11 27 11C25.3431 11 24 9.65685 24 8C24.0165 7.87797 24.0433 7.75755 24.08 7.64L19.08 5.16C18.5214 5.69843 17.7759 5.9995 17 6C16.4388 5.99095 15.8914 5.82465 15.42 5.52L9.82 10C9.93778 10.3203 9.9987 10.6587 10 11C10 12.6569 8.65685 14 7 14C5.34315 14 4 12.6569 4 11C4 9.34315 5.34315 8 7 8C7.55925 8.00307 8.1065 8.16239 8.58 8.46L14.18 4C14.0622 3.67969 14.0013 3.34127 14 3C14 1.34315 15.3431 0 17 0C18.6569 0 20 1.34315 20 3C20.0098 3.1198 20.0098 3.2402 20 3.36L24.92 5.84ZM6 11C6 11.5523 6.44772 12 7 12C7.55228 12 8 11.5523 8 11C8 10.4477 7.55228 10 7 10C6.44772 10 6 10.4477 6 11ZM17 4C16.4477 4 16 3.55228 16 3C16 2.44772 16.4477 2 17 2C17.5523 2 18 2.44772 18 3C18 3.26522 17.8946 3.51957 17.7071 3.70711C17.5196 3.89464 17.2652 4 17 4ZM26 8C26 8.55229 26.4477 9 27 9C27.5523 9 28 8.55229 28 8C28 7.44772 27.5523 7 27 7C26.4477 7 26 7.44772 26 8Z"
      fill="#00BFB3"
    />
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default IconVisualization;
