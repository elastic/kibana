/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiInMemoryTable, EuiLink, EuiButton } from '@elastic/eui';

import { Pipeline } from '../../../../common/types';

export interface Props {
  pipelines: Pipeline[];
  onReloadClick: () => void;
  onEditPipelineClick: (pipeline: Pipeline) => void;
  onDeletePipelineClick: (pipeline: Pipeline) => void;
  onViewPipelineClick: (pipeline: Pipeline) => void;
}

export const PipelineTable: FunctionComponent<Props> = ({
  pipelines,
  onReloadClick,
  onEditPipelineClick,
  onDeletePipelineClick,
  onViewPipelineClick,
}) => {
  return (
    <EuiInMemoryTable
      search={{
        toolsRight: (
          <EuiButton iconType="refresh" color="secondary" onClick={onReloadClick}>
            {i18n.translate('xpack.ingestPipelines.list.table.reloadButtonLabel', {
              defaultMessage: 'Reload',
            })}
          </EuiButton>
        ),
        box: {
          incremental: true,
        },
      }}
      pagination={{
        initialPageSize: 10,
        pageSizeOptions: [10, 20, 50],
      }}
      columns={[
        {
          field: 'name',
          name: i18n.translate('xpack.ingestPipelines.list.table.nameColumnTitle', {
            defaultMessage: 'Name',
          }),
          render: (name: any, pipeline) => (
            <EuiLink onClick={() => onViewPipelineClick(pipeline)}>{name}</EuiLink>
          ),
        },
        {
          name: i18n.translate('xpack.ingestPipelines.list.table.actionColumnTitle', {
            defaultMessage: 'Actions',
          }),
          actions: [
            {
              name: i18n.translate('xpack.ingestPipelines.list.table.editActionLabel', {
                defaultMessage: 'Edit',
              }),
              description: i18n.translate(
                'xpack.ingestPipelines.list.table.editActionDescription',
                { defaultMessage: 'Edit this pipeline' }
              ),
              type: 'icon',
              icon: 'pencil',
              onClick: onEditPipelineClick,
            },
            {
              name: i18n.translate('xpack.ingestPipelines.list.table.deleteActionLabel', {
                defaultMessage: 'Delete',
              }),
              description: i18n.translate(
                'xpack.ingestPipelines.list.table.deleteActionDescription',
                { defaultMessage: 'Delete this pipeline' }
              ),
              type: 'icon',
              icon: 'trash',
              color: 'danger',
              onClick: onDeletePipelineClick,
            },
          ],
        },
      ]}
      items={pipelines ?? []}
    />
  );
};
