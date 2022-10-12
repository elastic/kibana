/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { FC } from 'react';

import { ExceptionListHeader } from '@kbn/securitysolution-exception-list-components';

import { ListWithSearch } from './list_with_search';
import { useManageExceptionListDetails } from './hooks/use_manage_exception_list_details';
import type { ExceptionListDetailsComponentProps } from './types';

export const ExceptionListDetailsComponent: FC<ExceptionListDetailsComponentProps> = ({
  isReadOnly = false,
  list,
}) => {
  const { listName, listDescription, listId, onEditListDetails, onExportList, onDeleteList } =
    useManageExceptionListDetails({ isReadOnly, list });
  return (
    <>
      <ExceptionListHeader
        name={listName}
        description={listDescription}
        listId={listId}
        isReadonly={false}
        onEditListDetails={onEditListDetails}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
      />
      <ListWithSearch list={list} />
    </>
  );
};

ExceptionListDetailsComponent.displayName = 'ExceptionListDetailsComponent';
