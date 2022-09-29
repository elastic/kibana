/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from 'react';
import type { FC } from 'react';

import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ListHeader } from './list_header/list_header';

import { ListWithSearch } from './list_with_search';
import { useExceptionListDetailsContext } from './context/exception_list_details.context';

interface ExceptionListDetailsComponentProps {
  isReadOnly?: boolean;
  list: ExceptionListSchema;
}

export const ExceptionListDetailsComponent: FC<ExceptionListDetailsComponentProps> = ({
  isReadOnly = false,
  list,
}) => {
  const { name: listName, description: listDescription } = list;

  const { setIsReadOnly } = useExceptionListDetailsContext();
  useEffect(() => {
    setIsReadOnly(isReadOnly);
  }, []);
  return (
    <>
      <ListHeader title={listName} description={listDescription} />
      <ListWithSearch list={list} />
    </>
  );
};

ExceptionListDetailsComponent.displayName = 'ExceptionListDetailsComponent';
