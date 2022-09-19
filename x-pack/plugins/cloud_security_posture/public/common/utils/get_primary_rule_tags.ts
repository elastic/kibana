/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const regexForCISSemanticVersioning = /CIS ([0-9])(?:\.[0-9]\.?)?(?:[0-9])?/;

const isBenchmarkVersion = (tag: string) => regexForCISSemanticVersioning.test(tag);
const isBenchmarkType = (tag: string) => tag === 'Kubernetes' || tag === 'EKS';

export const getPrimaryRuleTags = (tags: string[]) =>
  tags.reduce<string[]>((acc, tag) => {
    if (isBenchmarkType(tag) || isBenchmarkVersion(tag)) acc.push(tag);

    return acc;
  }, []);
