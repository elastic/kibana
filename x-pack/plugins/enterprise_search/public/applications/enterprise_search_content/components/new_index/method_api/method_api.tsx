/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { Status } from '../../../../../../common/types/api';

import { NewSearchIndexTemplate } from '../new_search_index_template';

import { MethodApiLogic } from './method_api_logic';

export const MethodApi: React.FC = () => {
  const { makeRequest } = useActions(MethodApiLogic);
  const { status } = useValues(MethodApiLogic);
  return (
    <NewSearchIndexTemplate
      type="api"
      buttonLoading={status === Status.LOADING}
      onSubmit={(indexName, language) => makeRequest({ indexName, language })}
    />
  );
};
