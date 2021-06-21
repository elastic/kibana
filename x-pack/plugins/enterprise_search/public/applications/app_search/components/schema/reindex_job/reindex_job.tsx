/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { EuiPageHeader, EuiPageContentBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../../shared/kibana_chrome';
import { BreadcrumbTrail } from '../../../../shared/kibana_chrome/generate_breadcrumbs';
import { Loading } from '../../../../shared/loading';
import { SchemaErrorsAccordion } from '../../../../shared/schema';

import { ENGINE_DOCUMENT_DETAIL_PATH } from '../../../routes';
import { EngineLogic, generateEnginePath } from '../../engine';

import { ReindexJobLogic } from './reindex_job_logic';

interface Props {
  schemaBreadcrumb: BreadcrumbTrail;
}

export const ReindexJob: React.FC<Props> = ({ schemaBreadcrumb }) => {
  const { reindexJobId } = useParams() as { reindexJobId: string };
  const { loadReindexJob } = useActions(ReindexJobLogic);
  const { dataLoading, fieldCoercionErrors } = useValues(ReindexJobLogic);
  const {
    engine: { schema },
  } = useValues(EngineLogic);

  useEffect(() => {
    loadReindexJob(reindexJobId);
  }, [reindexJobId]);

  if (dataLoading) return <Loading />;

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
      <EuiPageContentBody>
        <SchemaErrorsAccordion
          fieldCoercionErrors={fieldCoercionErrors}
          schema={schema!}
          generateViewPath={(documentId: string) =>
            generateEnginePath(ENGINE_DOCUMENT_DETAIL_PATH, { documentId })
          }
        />
      </EuiPageContentBody>
    </>
  );
};
