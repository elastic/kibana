/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { EuiButton } from '@elastic/eui';
import { Page } from '../page';
import { TagTable } from '../tag_table';
import { txtTitle, txtSubtitle, txtCreateATag } from './i18n';

const callToAction = (
  <Link to={'/create'}>
    <EuiButton fill>{txtCreateATag}</EuiButton>
  </Link>
);

export const LandingPage: React.FC = () => {
  return (
    <Page
      id={'TagTable'}
      title={txtTitle}
      subtitle={<p>{txtSubtitle}</p>}
      callToAction={callToAction}
    >
      <TagTable />
    </Page>
  );
};
