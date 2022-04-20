/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSelect, EuiSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import type { SpanLinks as SpanLinksType } from '../../../../typings/es_schemas/raw/fields/span_links';
import { useFetcher } from '../../../hooks/use_fetcher';
import { SpanLinksCallout } from './span_links_callout';
import { SpanLinksTable } from './span_links_table';

interface Props {
  spanLinks: {
    incoming?: SpanLinksType;
    outgoing?: SpanLinksType;
  };
}

type LinkType = 'incoming' | 'outgoing';

export function SpanLinks({ spanLinks }: Props) {
  const [selectedLinkType, setSelectedLinkType] =
    useState<LinkType>('incoming');

  const currentLinks = useMemo(
    () => spanLinks[selectedLinkType],
    [selectedLinkType, spanLinks]
  );

  const { data } = useFetcher(
    (callApmApi) => {
      if (currentLinks && currentLinks.length) {
        return callApmApi('GET /internal/apm/span_links/details', {
          params: {
            query: {
              spanLinks: JSON.stringify(currentLinks),
            },
          },
        });
      }
    },
    [currentLinks]
  );

  const selectOptions: EuiSelectOption[] = [
    {
      value: 'incoming',
      text: i18n.translate('xpack.apm.spanLinks.combo.incomingLinks', {
        defaultMessage: 'Incoming links ({incomingLinksSize})',
        values: { incomingLinksSize: spanLinks.incoming?.length },
      }),
    },
    {
      value: 'outgoing',
      text: i18n.translate('xpack.apm.spanLinks.combo.outgoingLinks', {
        defaultMessage: 'Outgoing links ({outgoingLinksSize})',
        values: { outgoingLinksSize: spanLinks.outgoing?.length },
      }),
    },
  ];

  if (!data) {
    return null;
  }

  return (
    <div>
      <SpanLinksCallout />
      <EuiSelect
        options={selectOptions}
        value={selectedLinkType}
        onChange={(e) => {
          setSelectedLinkType(e.target.value as LinkType);
        }}
      />
      <SpanLinksTable items={data.spanLinksDetails} />
    </div>
  );
}
