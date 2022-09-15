/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const regexForCISSemanticVersioning = /CIS (0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)/;

export const getPrimaryRuleTags = (tags: string[]): { benchmark: string; version: string } =>
  tags.reduce(
    (acc, tag) => {
      if (tag === 'Kubernetes' || tag === 'EKS') acc.benchmark = tag;
      if (regexForCISSemanticVersioning.test(tag)) acc.version = tag;

      return acc;
    },
    { benchmark: '', version: '' }
  );
