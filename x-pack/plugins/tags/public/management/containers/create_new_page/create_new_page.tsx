/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Page } from '../page';
import { txtTitle, txtSubtitle } from './i18n';
import { CreateNewTagForm } from '../create_new_tag_form';

export const CreateNewPage: React.FC = () => {
  return (
    <Page
      id={'CreateNew'}
      title={txtTitle}
      subtitle={<p>{txtSubtitle}</p>}
      breadcrumbs={[{ text: txtTitle }]}
      separator
    >
      <CreateNewTagForm />
    </Page>
  );
};
