/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SPAN_HEX_ID, SPAN_ID } from 'x-pack/plugins/apm/common/constants';
import { Span } from 'x-pack/plugins/apm/typings/es_schemas/Span';
import { DiscoverLink } from './DiscoverLink';

function getDiscoverQuery(span: Span) {
  const query =
    span.version === 'v2'
      ? `${SPAN_HEX_ID}:"${span.span.hex_id}"`
      : `${SPAN_ID}:"${span.span.id}"`;

  return {
    _a: {
      interval: 'auto',
      query: {
        language: 'lucene',
        query
      }
    }
  };
}

export const DiscoverSpanLink: React.SFC<{
  readonly span: Span;
}> = ({ span, children }) => {
  return <DiscoverLink query={getDiscoverQuery(span)} children={children} />;
};
