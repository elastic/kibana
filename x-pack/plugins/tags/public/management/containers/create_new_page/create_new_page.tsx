/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { EuiButtonToggle } from '@elastic/eui';
import { Page } from '../page';
import { txtTitle, txtSubtitle, txtGoBack } from './i18n';
import { CreateNewTagForm } from '../create_new_tag_form';

export const CreateNewPage: React.FC = () => {
  return (
    <Page
      id={'CreateNew'}
      title={txtTitle}
      subtitle={<p>{txtSubtitle}</p>}
      breadcrumbs={[{ text: txtTitle }]}
      separator
      callToAction={
        <Link to={'/'}>
          <EuiButtonToggle label={txtGoBack} iconType={'arrowLeft'} isEmpty />
        </Link>
      }
    >
      <CreateNewTagForm />
    </Page>
  );
};
