/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiInMemoryTable, EuiLink, EuiButton } from '@elastic/eui';

import { BASE_PATH } from '../../../../common/constants';
import { Pipeline } from '../../../../common/types';

export interface Props {
  pipelines: Pipeline[];
  onReloadClick: () => void;
  onEditPipelineClick: (pipelineName: string) => void;
  onDeletePipelineClick: (pipelineName: string[]) => void;
  onViewPipelineClick: (pipeline: Pipeline) => void;
}

export const PipelineTable: FunctionComponent<Props> = ({
  pipelines,
  onReloadClick,
  onEditPipelineClick,
  onDeletePipelineClick,
  onViewPipelineClick,
}) => {
  const [selection, setSelection] = useState<Pipeline[]>([]);

  return (
    <EuiInMemoryTable
      itemId="name"
      isSelectable
      selection={{
        onSelectionChange: setSelection,
      }}
      search={{
        toolsLeft:
          selection.length > 0 ? (
            <EuiButton
              data-test-subj="deletePipelinesButton"
              onClick={() => onDeletePipelineClick(selection.map(pipeline => pipeline.name))}
              color="danger"
            >
              <FormattedMessage
                id="xpack.ingestPipelines.list.table.deletePipelinesButtonLabel"
                defaultMessage="Delete {count, plural, one {pipeline} other {pipelines} }"
                values={{ count: selection.length }}
              />
            </EuiButton>
          ) : (
            undefined
          ),
        toolsRight: [
          <EuiButton
            key="reloadButton"
            iconType="refresh"
            color="secondary"
            data-test-subj="reloadButton"
            onClick={onReloadClick}
          >
            {i18n.translate('xpack.ingestPipelines.list.table.reloadButtonLabel', {
              defaultMessage: 'Reload',
            })}
          </EuiButton>,
          <EuiButton
            href={`#${BASE_PATH}/create`}
            fill
            iconType="plusInCircle"
            data-test-subj="createPipelineButton"
            key="createPipelineButton"
          >
            {i18n.translate('xpack.ingestPipelines.list.table.createPipelineButtonLabel', {
              defaultMessage: 'Create a pipeline',
            })}
          </EuiButton>,
        ],
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
          render: (name: string, pipeline) => (
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
              onClick: ({ name }) => onEditPipelineClick(name),
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
              onClick: ({ name }) => onDeletePipelineClick([name]),
            },
          ],
        },
      ]}
      items={pipelines ?? []}
    />
  );
};
