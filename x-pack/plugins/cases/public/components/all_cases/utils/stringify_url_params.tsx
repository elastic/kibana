/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import type { AllCasesURLQueryParams } from '../types';

// export function stringifyUrlParams(urlParams: AllCasesURLQueryParams): string {
//   const urlSearchParams = new URLSearchParams();

//   for (const [key, value] of Object.entries(urlParams)) {
//     if (value) {
//       if (Array.isArray(value)) {
//         if (value.length === 0) {
//           urlSearchParams.append(key, '');
//         } else {
//           value.forEach((v) => urlSearchParams.append(key, v));
//         }
//       } else {
//         urlSearchParams.append(key, value);
//       }
//     }
//   }

//   return urlSearchParams.toString();
// }

export function stringifyUrlParams(urlParams: AllCasesURLQueryParams): string {
  const encodedUrlParams = encode({ ...urlParams });

  return encodedUrlParams;
}
