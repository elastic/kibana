/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiIconTip,
  EuiInMemoryTable,
  EuiLink,
} from '@elastic/eui';
import { PIPELINE_LIST } from '../../../common/constants';

function getColumns(openPipeline, clonePipeline) {
  return [
    {
      field: 'id',
      name: 'Id',
      sortable: true,
      render: (id, { isCentrallyManaged }) => {
        const openPipelineClicked = () => openPipeline(id);
        return isCentrallyManaged
          ? <EuiLink onClick={openPipelineClicked} data-test-subj="cellId">{id}</EuiLink>
          : (
            <span>
              {id} &nbsp;
              <EuiIconTip
                content={PIPELINE_LIST.PIPELINE_NOT_CENTRALLY_MANAGED_TOOLTIP_TEXT}
                type="questionInCircle"
              />
            </span>
          );
      }
    },
    {
      field: 'description',
      name: 'Description',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'lastModifiedHumanized',
      name: 'Last Modified',
      sortable: true,
    },
    {
      field: 'username',
      name: 'Modified By',
      sortable: true,
    },
    {
      field: 'id',
      name: '',
      render: (id, { isCentrallyManaged }) => {
        const cloneClicked = () => { clonePipeline(id); };
        return isCentrallyManaged
          ? (
            <EuiButtonEmpty
              iconType="copy"
              onClick={cloneClicked}
              size="xs"
            >
              Clone
            </EuiButtonEmpty>
          )
          : null;
      },
      sortable: false,
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
  // TODO: add pagination once EuiInMemoryTable bug fixed: https://github.com/elastic/eui/issues/1007
  // pageIndex,
  // pageSize,
  // pipelines,
}) {

  // const pagination = {
  //   pageIndex,
  //   pageSize,
  //   totalItemCount: pipelines.length,
  //   pageSizeOptions: [2, 3, 5, 8]
  // };

  const selectableMessage = (selectable, { id }) => selectable
    ? `Select pipeline "${id}"`
    : PIPELINE_LIST.PIPELINE_NOT_CENTRALLY_MANAGED_TOOLTIP_TEXT;

  const selectionOptions = isSelectable
    ? {
      selectable: ({ isCentrallyManaged }) => isCentrallyManaged,
      selectableMessage,
      onSelectionChange,
    }
    : null;

  const toolsRight = [
    <EuiButton
      isDisabled={isReadOnly}
      key="btnAdd"
      fill
      onClick={createPipeline}
      data-test-subj="btnAdd"
    >
      Create pipeline
    </EuiButton>,
    <EuiButton
      isDisabled={!selection.length || isReadOnly}
      key="btnDeletePipelines"
      color="danger"
      onClick={onDeleteSelectedPipelines}
      data-test-subj="btnDelete"
    >
      Delete
    </EuiButton>
  ];

  const search = {
    box: { incremental: true, 'data-test-subj': 'filter' },
    filters: [
      {
        type: 'field_value_selection',
        field: 'id',
        name: 'Id',
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
    toolsRight,
  };

  const columns = getColumns(openPipeline, clonePipeline);

  return (
    <EuiInMemoryTable
      columns={columns}
      itemId="id"
      items={pipelines}
      message={message}
      search={search}
      sorting={true}
      isSelectable={isSelectable}
      selection={selectionOptions}
      data-test-subj="pipelineTable"
    />
  );
}
