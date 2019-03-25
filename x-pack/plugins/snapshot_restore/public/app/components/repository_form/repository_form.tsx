/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { Repository } from '../../../../common/types';
import { useAppDependencies } from '../../index';

// import {
//   EuiPageBody,
//   EuiPageContent,
//   EuiTitle,
// } from '@elastic/eui'

interface Props {
  repository?: Repository;
}

export const RepositoryForm: React.FunctionComponent<Props> = ({ repository }) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  return <div>Form placeholder</div>;
};
