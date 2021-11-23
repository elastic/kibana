/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconProps } from '@elastic/eui';
import React from 'react';

export const LensIconChartGaugeHorizontal = ({
  title,
  titleId,
  ...props
}: Omit<EuiIconProps, 'type'>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      d="M0.8 13.6001C0.358172 13.6001 0 13.9583 0 14.4001V16.0001C0 16.4419 0.358172 16.8001 0.8 16.8001C1.24183 16.8001 1.6 16.4419 1.6 16.0001V15.2001H5.6V16.0001C5.6 16.4419 5.95817 16.8001 6.4 16.8001C6.84183 16.8001 7.2 16.4419 7.2 16.0001V15.2001H11.2V16.0001C11.2 16.4419 11.5582 16.8001 12 16.8001C12.4418 16.8001 12.8 16.4419 12.8 16.0001V15.2001H16.8V16.0001C16.8 16.4419 17.1582 16.8001 17.6 16.8001C18.0418 16.8001 18.4 16.4419 18.4 16.0001V15.2001H22.4V16.0001C22.4 16.4419 22.7582 16.8001 23.2 16.8001C23.6418 16.8001 24 16.4419 24 16.0001V14.4001C24 13.9583 23.6418 13.6001 23.2 13.6001H0.8Z"
      className="lensChartIcon__subdued"
    />
    <path
      d="M0 7.99995C0 7.55812 0.358172 7.19995 0.8 7.19995H20C20.4418 7.19995 20.8 7.55812 20.8 7.99995V11.2C20.8 11.6418 20.4418 12 20 12H0.800001C0.358173 12 0 11.6418 0 11.2V7.99995Z"
      className="lensChartIcon__accent"
    />
  </svg>
);

export const LensIconChartGaugeVertical = ({
  title,
  titleId,
  ...props
}: Omit<EuiIconProps, 'type'>) => (
  <svg
    width="16"
    height="4"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <g clipPath="url(#clip0_2146:118744)">
      <path
        d="M8.53333 16.5009C8.23878 16.5009 8 16.2622 8 15.9676L8 3.16761C8 2.87306 8.23878 2.63428 8.53333 2.63428L10.6667 2.63428C10.9612 2.63428 11.2 2.87306 11.2 3.16761L11.2 15.9676C11.2 16.2622 10.9612 16.5009 10.6667 16.5009H8.53333Z"
        className="lensChartIcon__accent"
      />
      <path
        d="M6.93338 1.03431C6.93338 0.739758 6.6946 0.500977 6.40005 0.500977H5.33338C5.03883 0.500977 4.80005 0.739758 4.80005 1.03431C4.80005 1.32886 5.03883 1.56764 5.33338 1.56764H5.86672L5.86672 4.23431H5.33338C5.03883 4.23431 4.80005 4.47309 4.80005 4.76764C4.80005 5.0622 5.03883 5.30098 5.33338 5.30098H5.86672L5.86672 7.96764H5.33338C5.03883 7.96764 4.80005 8.20642 4.80005 8.50098C4.80005 8.79553 5.03883 9.03431 5.33338 9.03431H5.86672L5.86671 11.701H5.33338C5.03883 11.701 4.80005 11.9398 4.80005 12.2343C4.80005 12.5289 5.03883 12.7676 5.33338 12.7676H5.86671L5.86671 15.4343H5.33338C5.03883 15.4343 4.80005 15.6731 4.80005 15.9676C4.80005 16.2622 5.03883 16.501 5.33338 16.501H6.40005C6.6946 16.501 6.93338 16.2622 6.93338 15.9676L6.93338 12.235C6.93338 12.2348 6.93338 12.2345 6.93338 12.2343C6.93338 12.2341 6.93338 12.2338 6.93338 12.2336L6.93338 1.03431Z"
        className="lensChartIcon__subdued"
      />
    </g>
    <clipPath id="clip0_2146:118744">
      <rect width="16" height="16" fill="white" transform="translate(0 0.500977)" />
    </clipPath>
  </svg>
);
