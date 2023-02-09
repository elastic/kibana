/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EnterpriseSearchSchemaField } from '../../../../../common/types/engines';
import { EngineViewTabs } from '../../routes';
import { EnterpriseSearchEnginesPageTemplate } from '../layout/engines_page_template';

import { EngineIndicesLogic } from './engine_indices_logic';

import { EngineViewLogic } from './engine_view_logic';

export const EngineSchema: React.FC = () => {
  const { engineName } = useValues(EngineIndicesLogic);
  const { isLoadingEngineSchema, schemaFields } = useValues(EngineViewLogic);
  const { fetchEngineSchema } = useActions(EngineViewLogic);
  const columns: Array<EuiBasicTableColumn<EnterpriseSearchSchemaField>> = [
    {
      field: 'field_name',
      name: i18n.translate('xpack.enterpriseSearch.content.engine.schema.field_name.columnTitle', {
        defaultMessage: 'Field name',
      }),
    },
    {
      field: 'field_type',
      name: i18n.translate('xpack.enterpriseSearch.content.engine.schema.field_type.columnTitle', {
        defaultMessage: 'Field Type',
      }),
    },
  ];

  useEffect(() => {
    fetchEngineSchema({ engineName });
  }, [engineName]);
  return (
    <EnterpriseSearchEnginesPageTemplate
      pageChrome={[engineName]}
      pageViewTelemetry={EngineViewTabs.SCHEMA}
      isLoading={isLoadingEngineSchema}
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.engine.schema.pageTitle', {
          defaultMessage: 'Schema',
        }),
      }}
      engineName={engineName}
    >
      <>
        <EuiBasicTable items={schemaFields} columns={columns} loading={isLoadingEngineSchema} />
      </>
    </EnterpriseSearchEnginesPageTemplate>
  );
};
