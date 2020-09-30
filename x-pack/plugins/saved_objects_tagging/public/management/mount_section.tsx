/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { ManagementAppMountParams } from '../../../../../src/plugins/management/public';
import { TagManagementPage } from './tag_management_page';

interface MountSectionParams {
  mountParams: ManagementAppMountParams;
}

export const mountSection = async ({ mountParams }: MountSectionParams) => {
  const { element, setBreadcrumbs } = mountParams;
  ReactDOM.render(
    <I18nProvider>
      <TagManagementPage setBreadcrumbs={setBreadcrumbs} />
    </I18nProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
