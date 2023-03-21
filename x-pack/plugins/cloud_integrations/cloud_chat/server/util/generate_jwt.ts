/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import jwt from 'jsonwebtoken';

export const generateSignedJwt = (userId: string, secret: string): string => {
  const options = {
    header: {
      alg: 'HS256',
      typ: 'JWT',
    },
    expiresIn: 5 * 60, // 5m
  };

  const payload = {
    sub: userId,
  };

  return jwt.sign(payload, secret, options);
};
