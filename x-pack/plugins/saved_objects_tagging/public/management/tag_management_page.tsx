/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, FC } from 'react';
import { EuiPageContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb } from 'src/core/public';
import { Header } from './components';

interface TagManagementPageParams {
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}

export const TagManagementPage: FC<TagManagementPageParams> = ({ setBreadcrumbs }) => {
  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('xpack.savedObjectsTagging.management.breadcrumb.index', {
          defaultMessage: 'Tags',
        }),
        href: '/',
      },
    ]);
  }, [setBreadcrumbs]);

  return (
    <EuiPageContent horizontalPosition="center">
      <Header />
    </EuiPageContent>
  );
};
