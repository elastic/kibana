/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  EmbeddableProfilingSearchBar,
  ProfilingEmptyState,
} from '@kbn/observability-shared-plugin/public';
import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { ApmDocumentType } from '../../../../common/document_type';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useLocalStorage } from '../../../hooks/use_local_storage';
import { usePreferredDataSourceAndBucketSize } from '../../../hooks/use_preferred_data_source_and_bucket_size';
import { useProfilingPlugin } from '../../../hooks/use_profiling_plugin';
import { useTimeRange } from '../../../hooks/use_time_range';
import { ApmPluginStartDeps } from '../../../plugin';
import { push } from '../../shared/links/url_helpers';
import { ProfilingFlamegraph } from './profiling_flamegraph';
import { ProfilingTopNFunctions } from './profiling_top_functions';

export function ProfilingOverview() {
  const history = useHistory();
  const { services } = useKibana<ApmPluginStartDeps>();
  const {
    path: { serviceName },
    query: { rangeFrom, rangeTo, environment, kuery },
  } = useApmParams('/services/{serviceName}/profiling');
  const { isProfilingAvailable, isLoading } = useProfilingPlugin();
  const { start, end, refreshTimeRange } = useTimeRange({ rangeFrom, rangeTo });
  const preferred = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery,
    type: ApmDocumentType.TransactionMetric,
    numBuckets: 20,
  });

  const [
    apmUniversalProfilingShowCallout,
    setAPMUniversalProfilingShowCallout,
  ] = useLocalStorage('apmUniversalProfilingShowCallout', true);

  const baseUrl =
    services.docLinks?.ELASTIC_WEBSITE_URL || 'https://www.elastic.co/';

  const tabs = useMemo((): EuiTabbedContentProps['tabs'] => {
    return [
      {
        id: 'flamegraph',
        name: i18n.translate('xpack.apm.profiling.tabs.flamegraph', {
          defaultMessage: 'Flamegraph',
        }),
        content: (
          <>
            <EuiSpacer />
            <ProfilingFlamegraph
              serviceName={serviceName}
              start={start}
              end={end}
              environment={environment}
              dataSource={preferred?.source}
              kuery={kuery}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
            />
          </>
        ),
      },
      {
        id: 'topNFunctions',
        name: i18n.translate('xpack.apm.profiling.tabs.topNFunctions', {
          defaultMessage: 'Top 10 Functions',
        }),
        content: (
          <>
            <EuiSpacer />
            <ProfilingTopNFunctions
              serviceName={serviceName}
              start={start}
              end={end}
              environment={environment}
              startIndex={0}
              endIndex={10}
              dataSource={preferred?.source}
              kuery={kuery}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
            />
          </>
        ),
      },
    ];
  }, [
    end,
    environment,
    kuery,
    preferred?.source,
    rangeFrom,
    rangeTo,
    serviceName,
    start,
  ]);

  if (isLoading) {
    return (
      <div
        css={css`
          display: flex;
          justify-content: center;
        `}
      >
        <EuiLoadingSpinner size="m" />
      </div>
    );
  }

  if (isProfilingAvailable === false) {
    return <ProfilingEmptyState />;
  }

  return (
    <>
      {apmUniversalProfilingShowCallout && (
        <>
          <EuiCallOut
            title={i18n.translate('xpack.apm.profiling.callout.title', {
              defaultMessage:
                'Displaying profiling insights from the host(s) running {serviceName} services',
              values: { serviceName },
            })}
            color="primary"
            iconType="iInCircle"
          >
            <p>
              {i18n.translate('xpack.apm.profiling.callout.description', {
                defaultMessage:
                  'Universal Profiling provides unprecedented code visibility into the runtime behaviour of all applications. It profiles every line of code on the host(s) running your services, including not only your application code but also the kernel and third-party libraries.',
              })}
            </p>
            <EuiFlexGroup direction="row">
              <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
                <EuiLink
                  href={`${baseUrl}observability/universal-profiling`}
                  target="_blank"
                  data-test-subj="apmProfilingOverviewLearnMoreLink"
                >
                  {i18n.translate('xpack.apm.profiling.callout.learnMore', {
                    defaultMessage: 'Learn more',
                  })}
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="apmProfilingOverviewLinkButtonButton"
                  color="primary"
                  onClick={() => {
                    setAPMUniversalProfilingShowCallout(false);
                  }}
                >
                  {i18n.translate('xpack.apm.profiling.callout.dismiss', {
                    defaultMessage: 'Dismiss',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      <EmbeddableProfilingSearchBar
        kuery={kuery}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        onQuerySubmit={(next) => {
          push(history, {
            query: {
              kuery: next.query,
              rangeFrom: next.dateRange.from,
              rangeTo: next.dateRange.to,
            },
          });
        }}
        onRefresh={refreshTimeRange}
      />
      <EuiSpacer />
      <EuiTabbedContent
        tabs={tabs}
        initialSelectedTab={tabs[0]}
        autoFocus="selected"
      />
    </>
  );
}
