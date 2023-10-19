/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { ScopedHistory } from '@kbn/core/public';
import { APP_WRAPPER_CLASS, useExecutionContext } from '../../../../shared_imports';
import { breadcrumbService, IndexManagementBreadcrumb } from '../../../services/breadcrumbs';
import { useAppContext } from '../../../app_context';
import { IndexTable } from './index_table';

export const IndexList: React.FunctionComponent<RouteComponentProps> = ({ history }) => {
  const {
    core: { executionContext },
  } = useAppContext();

  useExecutionContext(executionContext, {
    type: 'application',
    page: 'indexManagementIndicesTab',
  });

  useEffect(() => {
    breadcrumbService.setBreadcrumbs(IndexManagementBreadcrumb.indices);
  }, []);

  return (
    <div className={`${APP_WRAPPER_CLASS} im-snapshotTestSubject`} data-test-subj="indicesList">
      <IndexTable history={history as ScopedHistory} />
    </div>
  );
};
