/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import { RepositoryForm } from '../../components';
import { getHomeBreadcrumb, getRepositoryAddBreadcrumb } from '../../constants';
import { useAppDependencies } from '../../index';

import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';

export const RepositoryAdd: React.FunctionComponent = () => {
  const {
    core: { i18n, chrome },
    plugins: { management },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;

  useEffect(() => {
    chrome.breadcrumbs.set([
      management.constants.BREADCRUMB,
      getHomeBreadcrumb(i18n.translate),
      getRepositoryAddBreadcrumb(i18n.translate),
    ]);
  }, []);

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1>
            <FormattedMessage
              id="xpack.snapshotRestore.addRepository.title"
              defaultMessage="Register repository"
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="m" />
        <RepositoryForm />
      </EuiPageContent>
    </EuiPageBody>
  );
};
