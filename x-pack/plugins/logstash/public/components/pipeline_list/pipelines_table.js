/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty, EuiIconTip, EuiInMemoryTable, EuiLink } from '@elastic/eui';
import { PIPELINE_LIST } from './constants';

function getColumns(openPipeline, clonePipeline) {
  return [
    {
      field: 'id',
      name: 'Id',
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
      name: 'Description',
      render: description => <span data-test-subj="cellDescription">{description}</span>,
      sortable: true,
      truncateText: true,
    },
    {
      field: 'lastModifiedHumanized',
      name: 'Last Modified',
      render: lastModified => <span data-test-subj="cellLastModified">{lastModified}</span>,
      sortable: true,
    },
    {
      field: 'username',
      name: 'Modified By',
      render: username => <span data-test-subj="cellUsername">{username}</span>,
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
            Clone
          </EuiButtonEmpty>
        ) : null;
      },
      sortable: false,
      width: '100px',
    },
  ];
}

export function PipelinesTable({
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
}) {
  const pagination = {
    pageIndex,
    initialPageSize: PIPELINE_LIST.INITIAL_PAGE_SIZE,
    totalItemCount: pipelines.length,
    pageSizeOptions: PIPELINE_LIST.PAGE_SIZE_OPTIONS,
  };

  const selectableMessage = (selectable, { id }) =>
    selectable
      ? `Select pipeline "${id}"`
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
        Delete
      </EuiButton>
    ) : null;

  const search = {
    box: { incremental: true, 'data-test-subj': 'filter' },
    filters: [
      {
        type: 'field_value_selection',
        field: 'id',
        name: 'Filter by ID',
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
        Create pipeline
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
    />
  );
}
