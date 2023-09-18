/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconKeyword: React.FC<SVGProps<SVGSVGElement>> = (props) => (
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
      d="M16 1C7.71573 1 1 7.71573 1 16C1 24.2843 7.71573 31 16 31C24.2843 31 31 24.2843 31 16C31 7.71573 24.2843 1 16 1ZM15 3.03789C8.61759 3.52341 3.52341 8.61759 3.03789 15H6V17H3.03789C3.52341 23.3824 8.61759 28.4766 15 28.9621V26H17V28.9621C23.3824 28.4766 28.4766 23.3824 28.9621 17H26V15H28.9621C28.4766 8.61759 23.3824 3.52341 17 3.03789V6H15V3.03789Z"
      fill="#535966"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M15.3408 9H16.6596L22.6596 23H20.4837L19.1979 20L12.8025 20L11.5168 23H9.34082L15.3408 9ZM16.0002 12.5386L18.3408 18L13.6596 18L16.0002 12.5386Z"
      fill="#00BFB3"
    />
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default IconKeyword;
