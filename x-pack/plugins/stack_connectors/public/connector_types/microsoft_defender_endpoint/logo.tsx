/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiIcon, EuiIconProps } from '@elastic/eui';

const MicrosoftIconSvg = memo(() => {
  return (
    <svg
      version="1.0"
      xmlns="http://www.w3.org/2000/svg"
      width="400.000000pt"
      height="400.000000pt"
      viewBox="0 0 400.000000 400.000000"
      preserveAspectRatio="xMidYMid meet"
    >
      <g
        transform="translate(0.000000,400.000000) scale(0.100000,-0.100000)"
        fill="#0b61ce"
        stroke="none"
      >
        <path
          d="M1803 3476 c-134 -26 -244 -72 -380 -160 -235 -151 -542 -234 -875
-236 -42 0 -78 -4 -80 -10 -1 -5 0 -195 3 -422 5 -359 9 -429 27 -533 64 -360
184 -671 372 -959 243 -372 576 -670 978 -873 79 -40 149 -73 156 -73 27 0
299 143 411 217 605 397 999 1018 1105 1739 17 121 20 189 20 527 l0 387 -67
0 c-345 1 -642 82 -903 246 -192 121 -304 154 -535 160 -108 2 -183 -1 -232
-10z m382 -200 c99 -22 174 -53 264 -109 137 -86 152 -94 241 -132 188 -81
378 -128 575 -144 l80 -6 -1 -275 c-2 -430 -49 -682 -189 -1010 -204 -478
-604 -902 -1066 -1131 l-86 -42 -109 57 c-505 267 -888 703 -1082 1231 -111
301 -142 496 -145 910 l-2 260 50 3 c258 14 591 116 785 240 134 86 217 124
335 151 61 14 282 12 350 -3z"
        />
        <path
          d="M1895 3074 c-124 -30 -161 -46 -276 -120 -156 -101 -393 -194 -594
-234 -55 -11 -111 -23 -124 -26 l-24 -5 6 -212 c9 -344 68 -588 212 -882 112
-227 236 -396 431 -585 144 -139 303 -258 440 -328 l41 -21 75 43 c494 282
855 764 994 1329 36 149 54 309 54 494 0 160 0 163 -22 168 -13 3 -59 12 -103
21 -228 44 -446 130 -635 251 -140 88 -190 105 -335 109 -66 1 -129 1 -140 -2z
m375 -804 c-55 -110 -100 -202 -100 -205 0 -2 90 -6 201 -7 l201 -3 -458 -457
c-252 -252 -459 -456 -461 -454 -2 2 64 139 146 305 l151 301 -153 0 -153 0
180 360 181 360 183 0 182 0 -100 -200z"
        />
      </g>
    </svg>
  );
});
MicrosoftIconSvg.displayName = 'MicrosoftIconSvg';

export const MicrosoftDefenderEndpointLogo = memo<Omit<EuiIconProps, 'type'>>((props) => {
  return <EuiIcon {...props} type={MicrosoftIconSvg} />;
});
MicrosoftDefenderEndpointLogo.displayName = 'MicrosoftDefenderEndpointLogo';

// eslint-disable-next-line import/no-default-export
export { MicrosoftDefenderEndpointLogo as default };
