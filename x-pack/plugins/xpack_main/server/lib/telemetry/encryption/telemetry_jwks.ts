/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PublicJWKS } from '@elastic/request-crypto';

export const telemetryJWKS: PublicJWKS = {
  keys: [
    {
      kty: 'RSA',
      kid: 'kibana_dev',
      use: 'enc',
      alg: 'RSA-OAEP',
      e: 'AQAB',
      n:
        'kxa9RFxodOb5DPO4m87sXlp82-V1UD6fguSKmJgvMIcK7BsOmgFyYlWC6m23WfGkkR02fi6WlgBXx2PsZIr3dKCzA6O3KaJSzTh09VWANnSk2A0s6k-1Qe8Hyr8QKjtWjRYiUPJ0uB5sZZ0143RR1szFS17bIZn3VxT4RS9SDzvCkh5QYFJnHqTokIrdMc_DYIOjvC7mxCvqwhbh2vDVvovcn2d7xN8WPV2Ax1Sf9D9lvMcUO5DN-08VHLjm7eX_NKZXf21qRXqXQyQnsGWMdMeke5x5PWvl0ckv3Ip7YsaBLNH3HcId2gVx9QnnxlVb16oGWqu_t7wuOkKpSoiBNQ'
    },
    {
      kty: 'RSA',
      kid: 'kibana',
      use: 'enc',
      alg: 'RSA-OAEP',
      e: 'AQAB',
      n:
        'sF8XTRkCq13LTMeQG8R69nmiwjA9Pxj-R_DkaUTbfGMQebLJZAT1dhyaphoXUXson1nurSXFS7CKktR0cgrh17_Ngw1o0YooYKEGy9V6c1vMytNQ-PH3gTIP_kVx-ceKuwkLj9g36PLt9GDT8lxdxqB350acLzFuaoNmzfI76tkr0vwh2dBdt2n_h5szyvRAcmVSJDfi1G-DqsOivrSlIgOIsrzPcwHobONYq24M2Jaa5YYtSKsybUixaymFoqllaDa2PiYx9VaDQ712vDR4jjPnXHS8k6gPZcHDDscuYfnbedwiaiVjWBA8Is0TXdLd2cr3uV_URCBIQjPGJXllOw'
    },
  ],
};
