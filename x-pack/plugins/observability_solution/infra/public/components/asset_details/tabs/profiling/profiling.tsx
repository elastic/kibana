/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { EuiLink, EuiSpacer, EuiTabbedContent, type EuiTabbedContentProps } from '@elastic/eui';
import React, { useCallback } from 'react';
import {
  EmbeddableProfilingSearchBar,
  ProfilingEmptyState,
} from '@kbn/observability-shared-plugin/public';
import { EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Flamegraph } from './flamegraph';
import { Functions } from './functions';
import { useProfilingStatusData } from '../../hooks/use_profiling_status_data';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';
import { ContentTabIds } from '../../types';
import { ErrorPrompt } from './error_prompt';
import { Threads } from './threads';
import { DescriptionCallout } from './description_callout';
import { Popover } from '../common/popover';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useProfilingKuery } from '../../hooks/use_profiling_kuery';

export function Profiling() {
  const { activeTabId } = useTabSwitcherContext();
  const { dateRange, setDateRange } = useDatePickerContext();
  const { fullKuery, customKuery, setCustomKuery } = useProfilingKuery();
  const { error, loading, response } = useProfilingStatusData({
    isActive: activeTabId === ContentTabIds.PROFILING,
  });

  const onSearchSubmit = useCallback(
    ({ dateRange: range, query }) => {
      setDateRange(range);
      setCustomKuery(query);
    },
    [setCustomKuery, setDateRange]
  );
  const onSearchRefresh = useCallback(() => {
    setDateRange(dateRange);
  }, [dateRange, setDateRange]);

  const tabs: EuiTabbedContentProps['tabs'] = [
    {
      id: 'flamegraph',
      name: i18n.translate('xpack.infra.profiling.flamegraphTabName', {
        defaultMessage: 'Flamegraph',
      }),
      content: (
        <>
          <EuiSpacer />
          <Flamegraph kuery={fullKuery} />
        </>
      ),
      append: (
        <Popover iconSize="s" iconColor="subdued" icon="questionInCircle">
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.infra.profiling.flamegraphInfoPopoverBody"
              defaultMessage="See a visual representation of the functions that consume the most resources. Each rectangle represents a function. The rectangle width represents the time spent in the function, and the number of stacked rectangles represents the number of functions called to reach the current function. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink
                    data-test-subj="infraProfilingFlamegraphTabLearnMoreLink"
                    href="https://www.elastic.co/guide/en/observability/current/universal-profiling.html#profiling-flamegraphs-intro"
                    external
                    target="_blank"
                  >
                    {i18n.translate('xpack.infra.profiling.flamegraphTabLearnMoreLink', {
                      defaultMessage: 'Learn more',
                    })}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </Popover>
      ),
    },
    {
      id: 'functions',
      name: i18n.translate('xpack.infra.tabs.profiling.functionsTabName', {
        defaultMessage: 'Top 10 Functions',
      }),
      content: (
        <>
          <EuiSpacer />
          <Functions kuery={fullKuery} />
        </>
      ),
      append: (
        <Popover iconSize="s" iconColor="subdued" icon="questionInCircle">
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.infra.profiling.functionsInfoPopoverBody"
              defaultMessage="Identify the most expensive lines of code on your host by looking at the most frequently sampled functions, broken down by CPU time, annualized CO2, and annualized cost estimates. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink
                    data-test-subj="infraProfilingFunctionsTabLearnMoreLink"
                    href="https://www.elastic.co/guide/en/observability/current/universal-profiling.html#profiling-functions-intro"
                    external
                    target="_blank"
                  >
                    {i18n.translate('xpack.infra.profiling.functionsTabLearnMoreLink', {
                      defaultMessage: 'Learn more',
                    })}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </Popover>
      ),
    },
    {
      id: 'threads',
      name: i18n.translate('xpack.infra.tabs.profiling.threadsTabName', {
        defaultMessage: 'Threads',
      }),
      content: (
        <>
          <EuiSpacer />
          <Threads kuery={fullKuery} />
        </>
      ),
      append: (
        <Popover iconSize="s" iconColor="subdued" icon="questionInCircle">
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.infra.profiling.threadsInfoPopoverBody"
              defaultMessage="Visualize profiling stacktraces grouped by process thread names. This view enables you to identify the top threads consuming CPU resources and allows you to drill down into the call stack of each thread, so you can quickly identify resource-intensive lines of code within the thread."
            />
          </EuiText>
        </Popover>
      ),
    },
  ];

  if (loading) {
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

  if (error !== null) {
    return <ErrorPrompt />;
  }

  return (
    <>
      {response?.has_setup === false ? (
        <ProfilingEmptyState />
      ) : (
        <>
          <EmbeddableProfilingSearchBar
            kuery={customKuery}
            rangeFrom={dateRange.from}
            rangeTo={dateRange.to}
            onQuerySubmit={onSearchSubmit}
            onRefresh={onSearchRefresh}
          />
          <EuiSpacer />
          <DescriptionCallout />
          <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
        </>
      )}
    </>
  );
}
