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
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { SpanLinksCount } from '../../app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';
import { KueryBar } from '../kuery_bar';
import { SpanLinksCallout } from './span_links_callout';
import { SpanLinksTable } from './span_links_table';
import { useLocalStorage } from '../../../hooks/use_local_storage';

interface Props {
  spanLinksCount: SpanLinksCount;
  traceId: string;
  spanId: string;
  processorEvent: ProcessorEvent;
}

type LinkType = 'children' | 'parents';

export function SpanLinks({
  spanLinksCount,
  traceId,
  spanId,
  processorEvent,
}: Props) {
  const {
    query: { rangeFrom, rangeTo },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view'
  );
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const [selectedLinkType, setSelectedLinkType] = useState<LinkType>(
    spanLinksCount.linkedChildren ? 'children' : 'parents'
  );

  const [spanLinksCalloutDismissed, setSpanLinksCalloutDismissed] =
    useLocalStorage('apm.spanLinksCalloutDismissed', false);

  const [kuery, setKuery] = useState('');

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (selectedLinkType === 'children') {
        return callApmApi(
          'GET /internal/apm/traces/{traceId}/span_links/{spanId}/children',
          {
            params: {
              path: { traceId, spanId },
              query: { kuery, start, end },
            },
          }
        );
      }
      return callApmApi(
        'GET /internal/apm/traces/{traceId}/span_links/{spanId}/parents',
        {
          params: {
            path: { traceId, spanId },
            query: { kuery, start, end, processorEvent },
          },
        }
      );
    },
    [selectedLinkType, kuery, traceId, spanId, start, end, processorEvent]
  );

  const selectOptions: EuiSelectOption[] = useMemo(
    () => [
      {
        value: 'children',
        text: i18n.translate('xpack.apm.spanLinks.combo.childrenLinks', {
          defaultMessage: 'Incoming links ({linkedChildren})',
          values: { linkedChildren: spanLinksCount.linkedChildren },
        }),
        disabled: !spanLinksCount.linkedChildren,
      },
      {
        value: 'parents',
        text: i18n.translate('xpack.apm.spanLinks.combo.parentsLinks', {
          defaultMessage: 'Outgoing links ({linkedParents})',
          values: { linkedParents: spanLinksCount.linkedParents },
        }),
        disabled: !spanLinksCount.linkedParents,
      },
    ],
    [spanLinksCount]
  );

  if (!data || isPending(status)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <EuiLoadingSpinner />
      </div>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {!spanLinksCalloutDismissed && (
        <EuiFlexItem>
          <SpanLinksCallout
            dismissCallout={() => {
              setSpanLinksCalloutDismissed(true);
            }}
          />
        </EuiFlexItem>
      )}
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
