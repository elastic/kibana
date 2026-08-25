/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { INSTRUCTION_VARIANT } from '../../app/onboarding/instruction_variants';

const Onboarding = dynamic(() =>
  import('../../app/onboarding').then((mod) => ({ default: mod.Onboarding }))
);

export const onboarding = {
  '/onboarding': {
    element: <Onboarding />,
    params: z.object({
      query: z.object({
        agent: z
          .union([
            z.literal(INSTRUCTION_VARIANT.NODE),
            z.literal(INSTRUCTION_VARIANT.DJANGO),
            z.literal(INSTRUCTION_VARIANT.FLASK),
            z.literal(INSTRUCTION_VARIANT.RAILS),
            z.literal(INSTRUCTION_VARIANT.RACK),
            z.literal(INSTRUCTION_VARIANT.GO),
            z.literal(INSTRUCTION_VARIANT.JAVA),
            z.literal(INSTRUCTION_VARIANT.DOTNET),
            z.literal(INSTRUCTION_VARIANT.PHP),
          ])
          .optional(),
      }),
    }),
  },
};
