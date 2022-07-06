/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';

/**
 * Char set of 55 characters gets an even distribution for each byte of randomness
 * generated because 255 (max number) % 55 = 0.
 */
const CHAR_SET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRS0123456789';

/**
 * Generate 40 random characters of a pre-checked charset for share tokens.
 *
 * Samples:
 *
 * EyLtMzvK27QPOfINlJ6AmzfIRlenExBLBOtmrxvl
 * 1yr1oOmIEiBqRANHA5ztKrSf2dlB8cP6RMGDDHBt
 * FAgw2kh7af8s42zd1SguN8I0sev0LL3JvklyudHc
 * Qawttijgvhpc6zocBhoQ91Ajb8cdNQi8I4wrdIPk
 * FcseNpS7H6dQv96qzPrmaxQtzu61d5ibpbBOS9ML
 */
export function generateShareToken(): string {
  return [...crypto.randomBytes(40)].reduce((acc, byte) => {
    return acc + CHAR_SET[byte % CHAR_SET.length];
  }, '');
}
