/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { IngestPipelineParams } from '../../../../../../common/types/connectors';

import { FlyoutPanel } from './flyout_panel';

interface PipelinePanelProps {
  pipeline: IngestPipelineParams;
}

export const PipelinePanel: React.FC<PipelinePanelProps> = ({ pipeline }) => {
  const items: Array<{ setting: string; value: string | boolean }> = [
    {
      setting: i18n.translate('xpack.enterpriseSearch.content.index.syncJobs.pipeline.name', {
        defaultMessage: 'Pipeline name',
      }),
      value: pipeline.name,
    },
    {
      setting: i18n.translate(
        'xpack.enterpriseSearch.content.index.syncJobs.pipeline.extractBinaryContent',
        {
          defaultMessage: 'Extract binary content',
        }
      ),
      value: pipeline.extract_binary_content,
    },
    {
      setting: i18n.translate(
        'xpack.enterpriseSearch.content.index.syncJobs.pipeline.reduceWhitespace',
        {
          defaultMessage: 'Reduce whitespace',
        }
      ),
      value: pipeline.reduce_whitespace,
    },
    {
      setting: i18n.translate(
        'xpack.enterpriseSearch.content.index.syncJobs.pipeline.runMlInference',
        {
          defaultMessage: 'Machine learning inference',
        }
      ),
      value: pipeline.run_ml_inference,
    },
  ];
  const columns: Array<EuiBasicTableColumn<{ setting: string; value: string | boolean }>> = [
    {
      field: 'setting',
      name: i18n.translate('xpack.enterpriseSearch.content.index.syncJobs.pipeline.setting', {
        defaultMessage: 'Pipeline setting',
      }),
    },
    {
      field: 'value',
      name: i18n.translate('xpack.enterpriseSearch.content.index.syncJobs.documents.value', {
        defaultMessage: 'Value',
      }),
    },
  ];
  return (
    <FlyoutPanel
      title={i18n.translate('xpack.enterpriseSearch.content.index.syncJobs.pipeline.title', {
        defaultMessage: 'Pipeline',
      })}
    >
      <EuiBasicTable columns={columns} items={items} />
    </FlyoutPanel>
  );
};
