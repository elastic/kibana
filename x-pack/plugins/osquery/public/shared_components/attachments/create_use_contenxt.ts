/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Context } from 'react';
import { useContext } from 'react';

export const createUseContext =
  <T>(Ctx: Context<T>, name: string) =>
  () => {
    const ctx = useContext(Ctx);
    if (!ctx) {
      throw new Error(`${name} should be used inside of ${name}Provider!`);
    }

    return ctx;
  };
