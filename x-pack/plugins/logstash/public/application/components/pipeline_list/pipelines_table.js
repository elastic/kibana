/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty, EuiIconTip, EuiInMemoryTable, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { injectI18n, FormattedMessage } from '@kbn/i18n-react';
import { PIPELINE_LIST } from './constants';

function getColumns(openPipeline, clonePipeline) {
  return [
    {
      field: 'id',
      name: i18n.translate('xpack.logstash.pipelinesTable.idColumnLabel', { defaultMessage: 'Id' }),
      sortable: true,
      render: (id, { isCentrallyManaged }) => {
        const openPipelineClicked = () => openPipeline(id);
        return isCentrallyManaged ? (
          <EuiLink onClick={openPipelineClicked} data-test-subj="cellId">
            {id}
          </EuiLink>
        ) : (
          <span>
            {id} &nbsp;
            <EuiIconTip
              content={PIPELINE_LIST.PIPELINE_NOT_CENTRALLY_MANAGED_TOOLTIP_TEXT}
              type="questionInCircle"
            />
          </span>
        );
      },
    },
    {
      field: 'description',
      name: i18n.translate('xpack.logstash.pipelinesTable.descriptionColumnLabel', {
        defaultMessage: 'Description',
      }),
      render: (description) => <span data-test-subj="cellDescription">{description}</span>,
      sortable: true,
      truncateText: true,
    },
    {
      field: 'lastModifiedHumanized',
      name: i18n.translate('xpack.logstash.pipelinesTable.lastModifiedColumnLabel', {
        defaultMessage: 'Last modified',
      }),
      render: (lastModified) => <span data-test-subj="cellLastModified">{lastModified}</span>,
      sortable: ({ lastModified }) => lastModified.valueOf(),
    },
    {
      field: 'username',
      name: i18n.translate('xpack.logstash.pipelinesTable.modifiedByColumnLabel', {
        defaultMessage: 'Modified by',
      }),
      render: (username) => <span data-test-subj="cellUsername">{username}</span>,
      sortable: true,
    },
    {
      field: 'id',
      name: '',
      render: (id, { isCentrallyManaged }) => {
        const cloneClicked = () => {
          clonePipeline(id);
        };
        return isCentrallyManaged ? (
          <EuiButtonEmpty
            data-test-subj={`lnkPipelineClone-${id}`}
            iconType="copy"
            onClick={cloneClicked}
            size="xs"
          >
            <FormattedMessage
              id="xpack.logstash.pipelinesTable.cloneButtonLabel"
              defaultMessage="Clone"
            />
          </EuiButtonEmpty>
        ) : null;
      },
      sortable: false,
      width: '100px',
    },
  ];
}

function PipelinesTableUi({
  clonePipeline,
  createPipeline,
  isReadOnly,
  isSelectable,
  message,
  onDeleteSelectedPipelines,
  onSelectionChange,
  openPipeline,
  pipelines,
  selection,
  pageIndex,
  intl,
}) {
  const pagination = {
    pageIndex,
    initialPageSize: PIPELINE_LIST.INITIAL_PAGE_SIZE,
    totalItemCount: pipelines.length,
    pageSizeOptions: PIPELINE_LIST.PAGE_SIZE_OPTIONS,
  };

  const selectableMessage = (selectable, { id }) =>
    selectable
      ? intl.formatMessage(
          {
            id: 'xpack.logstash.pipelinesTable.selectablePipelineMessage',
            defaultMessage: `Select pipeline "{id}"`,
          },
          {
            id,
          }
        )
      : PIPELINE_LIST.PIPELINE_NOT_CENTRALLY_MANAGED_TOOLTIP_TEXT;

  const selectionOptions = isSelectable
    ? {
        selectable: ({ isCentrallyManaged }) => isCentrallyManaged,
        selectableMessage,
        onSelectionChange,
      }
    : null;

  // display when > 0 selected and user has write permission
  const deleteButton =
    selection.length && !isReadOnly ? (
      <EuiButton
        key="btnDeletePipelines"
        color="danger"
        onClick={onDeleteSelectedPipelines}
        data-test-subj="btnDeletePipeline"
      >
        <FormattedMessage
          id="xpack.logstash.pipelinesTable.deleteButtonLabel"
          defaultMessage="Delete"
        />
      </EuiButton>
    ) : null;

  const search = {
    box: { incremental: true, 'data-test-subj': 'filter' },
    filters: [
      {
        type: 'field_value_selection',
        field: 'id',
        name: i18n.translate('xpack.logstash.pipelinesTable.filterByIdLabel', {
          defaultMessage: 'Filter by ID',
        }),
        multiSelect: false,
        options: pipelines.map(({ id }) => {
          return {
            value: id,
            name: id,
            view: id,
          };
        }),
      },
    ],
    toolsLeft: deleteButton,
    toolsRight: (
      <EuiButton
        isDisabled={isReadOnly}
        key="btnAdd"
        fill
        onClick={createPipeline}
        data-test-subj="btnAdd"
      >
        <FormattedMessage
          id="xpack.logstash.pipelinesTable.createPipelineButtonLabel"
          defaultMessage="Create pipeline"
        />
      </EuiButton>
    ),
  };

  const columns = getColumns(openPipeline, clonePipeline);

  return (
    <EuiInMemoryTable
      columns={columns}
      data-test-subj="pipelineTable"
      isSelectable={isSelectable}
      itemId="id"
      items={pipelines}
      message={message}
      pagination={pagination}
      search={search}
      selection={selectionOptions}
      sorting={true}
      rowProps={{
        'data-test-subj': 'row',
      }}
    />
  );
}

export const PipelinesTable = injectI18n(PipelinesTableUi);
