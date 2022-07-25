/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiBadge, EuiInMemoryTable, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import { i18n } from '@kbn/i18n';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { useFieldFormatter } from '../../../contexts/kibana/use_field_formatter';
import { IngestStatsResponse } from './pipelines';
import { HelpIcon } from '../../../components/help_icon';

interface ProcessorsStatsProps {
  stats: Exclude<IngestStatsResponse, undefined>['pipelines'][string]['processors'];
}

type ProcessorStatsItem = ProcessorsStatsProps['stats'][number][string] & { id: string };

export const ProcessorsStats: FC<ProcessorsStatsProps> = ({ stats }) => {
  const durationFormatter = useFieldFormatter(FIELD_FORMAT_IDS.DURATION);

  const items: ProcessorStatsItem[] = stats.map((v, i) => {
    const key = Object.keys(v)[0];
    return {
      ...v[key],
      id: `${key}_${i}`,
    };
  });

  const columns: Array<EuiBasicTableColumn<ProcessorStatsItem>> = [
    {
      field: 'type',
      name: i18n.translate(
        'xpack.ml.trainedModels.modelsList.pipelines.processorStats.typeHeader',
        {
          defaultMessage: 'Processor type',
        }
      ),
      width: '100px',
      sortable: true,
      truncateText: false,
      render: (type: string) => {
        return <EuiBadge color="hollow">{type}</EuiBadge>;
      },
      'data-test-subj': 'mlProcessorStatsType',
    },
    {
      field: 'stats.count',
      name: (
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.pipelines.processorStats.countHeader"
              defaultMessage="Count"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <HelpIcon
              content={
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.pipelines.processorStats.countDescription"
                  defaultMessage="Total number of documents ingested during the lifetime of this node"
                />
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      width: '100px',
      truncateText: true,
      'data-test-subj': 'mlProcessorStatsCount',
    },
    /**
     * TODO Display when https://github.com/elastic/elasticsearch/issues/81037 is resolved
     */
    ...(true
      ? []
      : [
          {
            field: 'stats.time_in_millis',
            name: (
              <EuiFlexGroup gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.modelsList.pipelines.processorStats.timePerDocHeader"
                    defaultMessage="Time per doc"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <HelpIcon
                    content={
                      <FormattedMessage
                        id="xpack.ml.trainedModels.modelsList.pipelines.processorStats.timePerDocDescription"
                        defaultMessage="Total time spent preprocessing ingest documents during the lifetime of this node"
                      />
                    }
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
            width: '100px',
            truncateText: false,
            'data-test-subj': 'mlProcessorStatsTimePerDoc',
            render: (v: number) => {
              return durationFormatter(v);
            },
          },
        ]),
    {
      field: 'stats.current',
      name: (
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.pipelines.processorStats.currentHeader"
              defaultMessage="Current"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <HelpIcon
              content={
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.pipelines.processorStats.currentDescription"
                  defaultMessage="Total number of documents currently being ingested"
                />
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      width: '100px',
      truncateText: false,
      'data-test-subj': 'mlProcessorStatsCurrent',
    },
    {
      field: 'stats.failed',
      name: (
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.pipelines.processorStats.failedHeader"
              defaultMessage="Failed"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <HelpIcon
              content={
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.pipelines.processorStats.failedDescription"
                  defaultMessage="Total number of failed ingest operations during the lifetime of this node"
                />
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      width: '100px',
      'data-test-subj': 'mlProcessorStatsFailed',
    },
  ];

  return (
    <EuiInMemoryTable<ProcessorStatsItem>
      allowNeutralSort={false}
      columns={columns}
      hasActions={false}
      isExpandable={false}
      isSelectable={false}
      items={items}
      itemId={'id'}
      rowProps={(item) => ({
        'data-test-subj': `mlProcessorStatsTableRow row-${item.id}`,
      })}
      onTableChange={() => {}}
      data-test-subj={'mlProcessorStatsTable'}
    />
  );
};
