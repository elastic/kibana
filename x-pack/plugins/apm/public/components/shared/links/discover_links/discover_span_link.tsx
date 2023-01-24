/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { SPAN_ID } from '../../../../../common/es_fields/apm';
import { DiscoverLink } from './discover_link';

function getDiscoverQuery(spanId: string) {
  const query = `${SPAN_ID}:"${spanId}"`;
  return {
    _a: {
      interval: 'auto',
      query: {
        language: 'kuery',
        query,
      },
    },
  };
}

export function DiscoverSpanLink({
  spanId,
  children,
}: {
  readonly spanId: string;
  children?: ReactNode;
}) {
  return <DiscoverLink query={getDiscoverQuery(spanId)} children={children} />;
}
