/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { CSP_KUBEBEAT_INDEX_PATTERN } from '../../../common/constants';
import { CspClientPluginStartDeps } from '../../types';

/**
 *  TODO: use perfected kibana data views
 */
export const useKubebeatDataView = () => {
  const {
    data: { dataViews },
  } = useKibana<CspClientPluginStartDeps>().services;

  // TODO: check if index exists
  // if not, no point in creating a data view
  // const check = () => http?.get(`/kubebeat`);

  // TODO: use `dataViews.get(ID)`
  const findDataView = async () => (await dataViews.find(CSP_KUBEBEAT_INDEX_PATTERN))?.[0];

  return useQuery(['kubebeat_dataview'], findDataView);
};
