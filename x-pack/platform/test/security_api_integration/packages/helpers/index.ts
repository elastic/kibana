/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Cookie } from 'tough-cookie';
import { parse as parseCookie } from 'tough-cookie';

export function findSessionCookie(cookies: string | string[] | undefined): Cookie {
  const list = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
  const sidCookies = list.filter((c) => c.startsWith('sid='));
  if (sidCookies.length === 0) throw new Error('No sid cookie found in Set-Cookie headers');
  if (sidCookies.length > 1)
    throw new Error(`Expected exactly one sid cookie but found ${sidCookies.length}`);
  return parseCookie(sidCookies[0])!;
}
