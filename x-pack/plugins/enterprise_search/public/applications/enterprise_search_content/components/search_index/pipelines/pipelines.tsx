/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { DataPanel } from '../../../../shared/data_panel/data_panel';

export const SearchIndexPipelines: React.FC = () => {
  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <DataPanel
            hasBorder
            title={
              <h2>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.ingestionPipeline.title',
                  {
                    defaultMessage: 'Ingest Pipelines',
                  }
                )}
              </h2>
            }
            iconType="logstashInput"
          >
            <div />
          </DataPanel>
          <EuiSpacer />
          <DataPanel
            hasBorder
            title={
              <h2>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.mlInferencePipelines.title',
                  {
                    defaultMessage: 'ML Inference pipelines',
                  }
                )}
              </h2>
            }
            iconType="compute"
          >
            <div />
          </DataPanel>
        </EuiFlexItem>
        <EuiFlexItem />
      </EuiFlexGroup>
    </>
  );
};
