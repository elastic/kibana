/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSelectOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { useApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { SpanLinksCount } from '../../app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';
import { KueryBar } from '../kuery_bar';
import { SpanLinksCallout } from './span_links_callout';
import { SpanLinksTable } from './span_links_table';

interface Props {
  spanLinksCount: SpanLinksCount;
  traceId: string;
  spanId: string;
}

type LinkType = 'incoming' | 'outgoing';

export function SpanLinks({ spanLinksCount, traceId, spanId }: Props) {
  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/transactions/view');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const [selectedLinkType, setSelectedLinkType] = useState<LinkType>(
    spanLinksCount.incoming ? 'incoming' : 'outgoing'
  );

  const [kuery, setKuery] = useState('');

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (selectedLinkType === 'incoming') {
        return callApmApi('GET /internal/apm/span_links/incoming', {
          params: {
            query: { kuery, traceId, spanId },
          },
        });
      }
      return callApmApi('GET /internal/apm/span_links/outgoing', {
        params: {
          query: { kuery, traceId, spanId, start, end },
        },
      });
    },
    [selectedLinkType, kuery, traceId, spanId, start, end]
  );

  const selectOptions: EuiSelectOption[] = useMemo(
    () => [
      {
        value: 'incoming',
        text: i18n.translate('xpack.apm.spanLinks.combo.incomingLinks', {
          defaultMessage: 'Incoming links ({incomingLinksSize})',
          values: { incomingLinksSize: spanLinksCount.incoming },
        }),
        disabled: !spanLinksCount.incoming,
      },
      {
        value: 'outgoing',
        text: i18n.translate('xpack.apm.spanLinks.combo.outgoingLinks', {
          defaultMessage: 'Outgoing links ({outgoingLinksSize})',
          values: { outgoingLinksSize: spanLinksCount.outgoing },
        }),
        disabled: !spanLinksCount.outgoing,
      },
    ],
    [spanLinksCount]
  );

  if (
    !data ||
    status === FETCH_STATUS.LOADING ||
    status === FETCH_STATUS.NOT_INITIATED
  ) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <EuiLoadingSpinner />
      </div>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <SpanLinksCallout />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <KueryBar
              onSubmit={(value) => {
                setKuery(value);
              }}
              value={kuery}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSelect
              data-test-subj="spanLinkTypeSelect"
              options={selectOptions}
              value={selectedLinkType}
              onChange={(e) => {
                setSelectedLinkType(e.target.value as LinkType);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <SpanLinksTable items={data.spanLinksDetails} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
