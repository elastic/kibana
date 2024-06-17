/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import React from 'react';
import { Onboarding } from '../../app/onboarding';
import { INSTRUCTION_VARIANT } from '../../app/onboarding/instruction_variants';

export const onboarding = {
  '/onboarding': {
    element: <Onboarding />,
    params: t.partial({
      query: t.partial({
        agent: t.union([
          t.literal(INSTRUCTION_VARIANT.NODE),
          t.literal(INSTRUCTION_VARIANT.DJANGO),
          t.literal(INSTRUCTION_VARIANT.FLASK),
          t.literal(INSTRUCTION_VARIANT.RAILS),
          t.literal(INSTRUCTION_VARIANT.RACK),
          t.literal(INSTRUCTION_VARIANT.GO),
          t.literal(INSTRUCTION_VARIANT.JAVA),
          t.literal(INSTRUCTION_VARIANT.DOTNET),
          t.literal(INSTRUCTION_VARIANT.PHP),
          t.literal(INSTRUCTION_VARIANT.OPEN_TELEMETRY),
        ]),
      }),
    }),
  },
};
