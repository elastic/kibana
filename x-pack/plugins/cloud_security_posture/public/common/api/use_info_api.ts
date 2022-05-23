/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { useKibana } from '../hooks/use_kibana';
import { Info } from '../../../common/types';
import { INFO_ROUTE_PATH } from '../../../common/constants';

const getInfoQueryKey = 'csp_info_key';

export const useInfoApi = () => {
  const { http } = useKibana().services;
  return useQuery([getInfoQueryKey], () => http.get<Info>(INFO_ROUTE_PATH));
};
