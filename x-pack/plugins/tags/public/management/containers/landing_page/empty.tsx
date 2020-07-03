/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { EuiButton } from '@elastic/eui';
import { Link } from 'react-router-dom';
import { txtSubtitle, txtCreateATag } from './i18n';

export const Empty: React.FC = () => {
  return (
    <EuiEmptyPrompt
      data-test-subj="jobListEmptyPrompt"
      iconType="indexRollupApp"
      title={<h1>Create your first tag</h1>}
      body={
        <>
          <p>{txtSubtitle}</p>
        </>
      }
      actions={
        <Link to={'/create'}>
          <EuiButton fill iconType="plusInCircle">
            {txtCreateATag}
          </EuiButton>
        </Link>
      }
    />
  );
};
