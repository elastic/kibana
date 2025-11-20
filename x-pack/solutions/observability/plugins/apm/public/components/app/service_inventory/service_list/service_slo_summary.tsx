/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { useFetcher } from '../../../../hooks/use_fetcher';

const SLO_OVERVIEW_EMBEDDABLE_ID = 'SLO_EMBEDDABLE';

interface Props {
  serviceName: string;
}

export function ServiceSloSummary({ serviceName }: Props) {
  const { data: sloCount, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/services/{serviceName}/slos_count', {
        params: {
          path: {
            serviceName,
          },
        },
      });
    },
    [serviceName]
  );

  if (status === 'loading') {
    return (
      <EuiPanel paddingSize="m" color="transparent" hasBorder>
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  if (!sloCount || sloCount.slosCount === 0) {
    return (
      <EuiPanel paddingSize="m" color="transparent" hasBorder>
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.apm.serviceInventory.sloSummary.noSlos', {
            defaultMessage: 'No SLOs found for this service',
          })}
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.apm.serviceInventory.sloSummary.title', {
                defaultMessage: 'SLOs',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <div data-test-subj={`sloSummaryEmbeddable-${serviceName}`}>
            <EmbeddableRenderer
              type={SLO_OVERVIEW_EMBEDDABLE_ID}
              getParentApi={() => ({
                getSerializedStateForChild: () => ({
                  rawState: {
                    overviewMode: 'groups',
                    groupFilters: {
                      groupBy: 'status',
                      kqlQuery: `(service.name: "${serviceName}" OR slo.tags: "service.name:${serviceName}" OR slo.tags: "service:${serviceName}")`,
                    },
                  },
                }),
              })}
              hidePanelChrome={true}
            />
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
