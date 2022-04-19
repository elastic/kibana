/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { Span } from '../../../../typings/es_schemas/ui/span';
import { SpanLinksCallout } from './span_links_callout';
import { useFetcher } from '../../../hooks/use_fetcher';

interface Props {
  span: Span;
}

export function SpanLinks({ span }: Props) {
  const { data } = useFetcher(
    (callApmApi) => {
      if (span.span.links) {
        return callApmApi('GET /internal/apm/span_links', {
          params: {
            query: { spanLinks: JSON.stringify(span.span.links) },
          },
        });
      }
    },
    [span.span.links]
  );

  return (
    <div>
      <SpanLinksCallout />
    </div>
  );
}
