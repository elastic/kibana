/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation, useParams } from 'react-router-dom';
const INSTANCE_SEARCH_PARAM = 'instanceId';

export const useQueryMeta = () => {
  const params = useParams<{ sloId?: string }>();

  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);

  const instanceId = searchParams.get(INSTANCE_SEARCH_PARAM);
  return {
    sloId: params.sloId,
    sloInstanceId: instanceId,
  };
};
