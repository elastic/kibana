/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiBadge, EuiInMemoryTable } from '@elastic/eui';
import { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import { i18n } from '@kbn/i18n';
import { useFieldFormatter } from '../../../contexts/kibana/use_field_formatter';
import { FIELD_FORMAT_IDS } from '../../../../../../../../src/plugins/field_formats/common';
import { IngestStatsResponse } from './pipelines';

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
      name: i18n.translate(
        'xpack.ml.trainedModels.modelsList.pipelines.processorStats.countHeader',
        {
          defaultMessage: 'Count',
        }
      ),
      width: '100px',
      truncateText: true,
      'data-test-subj': 'mlProcessorStatsCount',
    },
    {
      field: 'stats.time_in_millis',
      name: i18n.translate(
        'xpack.ml.trainedModels.modelsList.pipelines.processorStats.timePerDocHeader',
        {
          defaultMessage: 'Time per doc',
        }
      ),
      width: '100px',
      truncateText: false,
      'data-test-subj': 'mlProcessorStatsTypePerDoc',
      render: (v: number) => {
        return durationFormatter(v);
      },
    },
    {
      field: 'stats.current',
      name: i18n.translate(
        'xpack.ml.trainedModels.modelsList.pipelines.processorStats.currentHeader',
        {
          defaultMessage: 'Current',
        }
      ),
      width: '100px',
      truncateText: false,
      'data-test-subj': 'mlProcessorStatsCurrent',
    },
    {
      field: 'stats.failed',
      name: i18n.translate(
        'xpack.ml.trainedModels.modelsList.pipelines.processorStats.failedHeader',
        {
          defaultMessage: 'Failed',
        }
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
