/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Threat } from '../common/schemas';

export const getThreatMock = (): Threat => [
  {
    framework: 'MITRE ATT&CK',
    tactic: {
      id: 'TA0000',
      name: 'test tactic',
      reference: 'https://attack.mitre.org/tactics/TA0000/',
    },
    technique: [
      {
        id: 'T0000',
        name: 'test technique',
        reference: 'https://attack.mitre.org/techniques/T0000/',
        subtechnique: [
          {
            id: 'T0000.000',
            name: 'test subtechnique',
            reference: 'https://attack.mitre.org/techniques/T0000/000/',
          },
        ],
      },
    ],
  },
];
