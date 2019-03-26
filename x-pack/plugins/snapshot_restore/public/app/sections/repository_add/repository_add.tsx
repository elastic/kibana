/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { Repository } from '../../../../common/types';
import { RepositoryForm } from '../../components';
import { BASE_PATH, getHomeBreadcrumb, getRepositoryAddBreadcrumb, Section } from '../../constants';
import { useAppDependencies } from '../../index';

import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';

export const RepositoryAdd: React.FunctionComponent<RouteComponentProps> = ({ history }) => {
  const {
    core: { i18n, chrome },
    plugins: { management },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const section = 'repositories' as Section;

  useEffect(() => {
    chrome.breadcrumbs.set([
      management.constants.BREADCRUMB,
      getHomeBreadcrumb(i18n.translate),
      getRepositoryAddBreadcrumb(i18n.translate),
    ]);
  }, []);

  const onSave = (newRepository: Repository) => {
    return;
  };

  const onCancel = () => {
    history.push(`${BASE_PATH}/${section}`);
  };

  const emptyRepository = {
    name: '',
    type: '',
    settings: {},
  };

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
        <EuiSpacer size="l" />
        <RepositoryForm repository={emptyRepository} onSave={onSave} onCancel={onCancel} />
      </EuiPageContent>
    </EuiPageBody>
  );
};
