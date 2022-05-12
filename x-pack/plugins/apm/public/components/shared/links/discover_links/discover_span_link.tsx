/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { SPAN_ID } from '../../../../../common/elasticsearch_fieldnames';
import { Span } from '../../../../../typings/es_schemas/ui/span';
import { DiscoverLink } from './discover_link';

function getDiscoverQuery(span: Span) {
  const query = `${SPAN_ID}:"${span.span.id}"`;
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
  span,
  children,
}: {
  readonly span: Span;
  children?: ReactNode;
}) {
  return <DiscoverLink query={getDiscoverQuery(span)} children={children} />;
}
