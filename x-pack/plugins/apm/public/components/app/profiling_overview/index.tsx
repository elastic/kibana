/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentProps,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useProfilingPlugin } from '../../../hooks/use_profiling_plugin';
import { useTimeRange } from '../../../hooks/use_time_range';
import { ProfilingFlamegraph } from './profiling_flamegraph';
import { ProfilingTopNFunctions } from './profiling_top_functions';
import { usePreferredDataSourceAndBucketSize } from '../../../hooks/use_preferred_data_source_and_bucket_size';
import { ApmDocumentType } from '../../../../common/document_type';

export function ProfilingOverview() {
  const {
    path: { serviceName },
    query: { rangeFrom, rangeTo, environment, kuery },
  } = useApmParams('/services/{serviceName}/profiling');
  const { isProfilingAvailable } = useProfilingPlugin();
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const preferred = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery,
    type: ApmDocumentType.TransactionMetric,
    numBuckets: 20,
  });

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
            />
          </>
        ),
      },
    ];
  }, [end, environment, preferred?.source, serviceName, start]);

  if (!isProfilingAvailable) {
    return null;
  }

  return (
    <EuiTabbedContent
      tabs={tabs}
      initialSelectedTab={tabs[0]}
      autoFocus="selected"
    />
  );
}
