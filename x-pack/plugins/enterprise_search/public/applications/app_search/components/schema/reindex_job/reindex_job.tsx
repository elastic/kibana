/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';

import { EuiPageHeader, EuiPageContentBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../../shared/kibana_chrome';
import { BreadcrumbTrail } from '../../../../shared/kibana_chrome/generate_breadcrumbs';

interface Props {
  schemaBreadcrumb: BreadcrumbTrail;
}

export const ReindexJob: React.FC<Props> = ({ schemaBreadcrumb }) => {
  const { reindexJobId } = useParams() as { reindexJobId: string };

  return (
    <>
      <SetPageChrome
        trail={[
          ...schemaBreadcrumb,
          i18n.translate('xpack.enterpriseSearch.appSearch.engine.schema.reindexErrorsBreadcrumb', {
            defaultMessage: 'Reindex errors',
          }),
        ]}
      />
      <EuiPageHeader
        pageTitle={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.schema.reindexJob.title',
          { defaultMessage: 'Schema change errors' }
        )}
      />
      <FlashMessages />
      <EuiPageContentBody>{reindexJobId}</EuiPageContentBody>
    </>
  );
};
