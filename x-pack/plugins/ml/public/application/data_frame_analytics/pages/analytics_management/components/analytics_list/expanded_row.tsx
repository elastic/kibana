/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import moment from 'moment-timezone';

import { EuiProgress, EuiTabbedContent } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { formatHumanReadableDateTimeSeconds } from '@kbn/ml-date-utils';
import { getAnalysisType } from '@kbn/ml-data-frame-analytics-utils';

import type { DataFrameAnalyticsListRow } from './common';
import type { SectionConfig } from './expanded_row_details_pane';
import { ExpandedRowDetailsPane } from './expanded_row_details_pane';
import { ExpandedRowJsonPane } from './expanded_row_json_pane';

import { getDataFrameAnalyticsProgressPhase } from './common';
import { ExpandedRowMessagesPane } from './expanded_row_messages_pane';

function getItemDescription(value: any) {
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value.toString();
}

interface Props {
  item: DataFrameAnalyticsListRow;
}

export const ExpandedRow: FC<Props> = ({ item }) => {
  const analysisType = getAnalysisType(item.config.analysis);
  const stateValues: any = { ...item.stats };

  const analysisStatsValues = stateValues.analysis_stats
    ? stateValues.analysis_stats[`${analysisType}_stats`]
    : undefined;

  if (item.config?.description) {
    stateValues.description = item.config.description;
  }
  delete stateValues.progress;

  const dataCounts: SectionConfig = {
    title: i18n.translate(
      'xpack.ml.dataframe.analyticsList.expandedRow.tabs.jobSettings.dataCounts',
      {
        defaultMessage: 'Data counts',
      }
    ),
    items: [
      {
        title: i18n.translate(
          'xpack.ml.dataframe.analyticsList.expandedRow.tabs.jobSettings.trainingDocsCount',
          {
            defaultMessage: 'Training docs',
          }
        ),
        description: stateValues.data_counts.training_docs_count,
      },
      {
        title: i18n.translate(
          'xpack.ml.dataframe.analyticsList.expandedRow.tabs.jobSettings.testDocsCount',
          {
            defaultMessage: 'Test docs',
          }
        ),
        description: stateValues.data_counts.test_docs_count,
      },
      {
        title: i18n.translate(
          'xpack.ml.dataframe.analyticsList.expandedRow.tabs.jobSettings.skippedDocsCount',
          {
            defaultMessage: 'Skipped docs',
          }
        ),
        description: stateValues.data_counts.skipped_docs_count,
      },
    ],
    dataTestSubj: 'mlAnalyticsTableRowDetailsSection counts',
  };

  const memoryUsage: SectionConfig = {
    title: i18n.translate(
      'xpack.ml.dataframe.analyticsList.expandedRow.tabs.jobSettings.memoryUsage',
      {
        defaultMessage: 'Memory usage',
      }
    ),
    items: [
      {
        title: i18n.translate(
          'xpack.ml.dataframe.analyticsList.expandedRow.tabs.jobSettings.timestamp',
          {
            defaultMessage: 'Timestamp',
          }
        ),
        description: formatHumanReadableDateTimeSeconds(
          moment(stateValues.memory_usage.timestamp).unix() * 1000
        ),
      },
      {
        title: i18n.translate(
          'xpack.ml.dataframe.analyticsList.expandedRow.tabs.jobSettings.peakUsageBytes',
          {
            defaultMessage: 'Peak usage bytes',
          }
        ),
        description: stateValues.memory_usage.peak_usage_bytes,
      },
      { title: 'Status', description: stateValues.memory_usage.status },
    ],
    dataTestSubj: 'mlAnalyticsTableRowDetailsSection stats',
  };

  const { currentPhase, totalPhases } = getDataFrameAnalyticsProgressPhase(item.stats);

  const progress: SectionConfig = {
    title: i18n.translate(
      'xpack.ml.dataframe.analyticsList.expandedRow.tabs.jobSettings.progressTitle',
      {
        defaultMessage: 'Phase {phase}',
        values: { phase: `${currentPhase}/${totalPhases}` },
      }
    ),
    items: [
      ...item.stats.progress.map((s) => {
        return {
          title: s.phase,
          description: (
            <EuiProgress
              label={s.phase}
              valueText={true}
              value={s.progress_percent}
              max={100}
              color="success"
              size="s"
            />
          ),
        };
      }),
    ],
    dataTestSubj: 'mlAnalyticsTableRowDetailsSection progress',
  };

  const overallDetails: SectionConfig = {
    title: i18n.translate('xpack.ml.dataframe.analyticsList.expandedRow.tabs.jobSettings.stats', {
      defaultMessage: 'Overall',
    }),
    items: [
      { title: 'badge', description: stateValues.state },
      {
        title: 'Create time',
        description: formatHumanReadableDateTimeSeconds(
          moment(item.config.create_time).unix() * 1000
        ),
      },
      {
        title: i18n.translate(
          'xpack.ml.dataframe.analyticsList.expandedRow.tabs.jobSettings.modelMemoryLimit',
          {
            defaultMessage: 'Model memory limit',
          }
        ),
        description: item.config.model_memory_limit ?? '',
      },
      {
        title: i18n.translate(
          'xpack.ml.dataframe.analyticsList.expandedRow.tabs.jobSettings.version',
          {
            defaultMessage: 'Version',
          }
        ),
        description: item.config.version ?? '',
      },
    ],
    dataTestSubj: 'mlAnalyticsTableRowDetailsSection state',
  };

  const analysisStats: SectionConfig | undefined = analysisStatsValues
    ? {
        title: i18n.translate(
          'xpack.ml.dataframe.analyticsList.expandedRow.tabs.jobSettings.analysisStats',
          {
            defaultMessage: 'Analysis stats',
          }
        ),
        items: [
          {
            title: 'timestamp',
            description: formatHumanReadableDateTimeSeconds(
              moment(analysisStatsValues.timestamp).unix() * 1000
            ),
          },
          {
            title: 'timing_stats',
            description: getItemDescription(analysisStatsValues.timing_stats),
          },
          ...Object.entries(
            analysisStatsValues.parameters || analysisStatsValues.hyperparameters || {}
          ).map(([stateKey, stateValue]) => {
            const title = stateKey.toString();
            return { title, description: getItemDescription(stateValue) };
          }),
        ],
        dataTestSubj: 'mlAnalyticsTableRowDetailsSection analysisStats',
      }
    : undefined;

  const tabs = [
    {
      id: 'ml-analytics-job-details',
      name: i18n.translate('xpack.ml.dataframe.analyticsList.expandedRow.tabs.jobSettingsLabel', {
        defaultMessage: 'Details',
      }),
      content: (
        <ExpandedRowDetailsPane
          overallDetails={overallDetails}
          dataCounts={dataCounts}
          memoryUsage={memoryUsage}
          analysisStats={analysisStats}
          progress={progress}
          dataTestSubj={`mlAnalyticsTableRowDetailsTabContent job-details ${item.config.id}`}
        />
      ),
      'data-test-subj': `mlAnalyticsTableRowDetailsTab job-details ${item.config.id}`,
    },
    {
      id: 'ml-analytics-job-json',
      name: 'JSON',
      content: (
        <ExpandedRowJsonPane
          json={item.config}
          dataTestSubj={`mlAnalyticsTableRowDetailsTabContent json ${item.config.id}`}
        />
      ),
      'data-test-subj': `mlAnalyticsTableRowDetailsTab json ${item.config.id}`,
    },
    {
      id: 'ml-analytics-job-messages',
      name: i18n.translate(
        'xpack.ml.dataframe.analyticsList.analyticsDetails.tabs.analyticsMessagesLabel',
        {
          defaultMessage: 'Messages',
        }
      ),
      content: (
        <ExpandedRowMessagesPane
          analyticsId={item.id}
          dataTestSubj={`mlAnalyticsTableRowDetailsTabContent job-messages ${item.config.id}`}
        />
      ),
      'data-test-subj': `mlAnalyticsTableRowDetailsTab job-messages ${item.config.id}`,
    },
  ];

  // Using `expand=false` here so the tabs themselves don't spread
  // across the full width. The 100% width is used so the bottom line
  // as well as the tab content spans across the full width.
  // EuiTabbedContent would do that usually anyway,
  // it just doesn't seem to work within certain layouts.
  return (
    <EuiTabbedContent
      size="s"
      tabs={tabs}
      initialSelectedTab={tabs[0]}
      onTabClick={() => {}}
      expand={false}
      style={{ width: '100%' }}
      data-test-subj={`mlAnalyticsTableRowDetails-${item.config.id}`}
    />
  );
};
