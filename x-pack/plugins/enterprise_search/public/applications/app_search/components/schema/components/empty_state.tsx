/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SchemaAddFieldModal } from '../../../../shared/schema';
import { INDEXING_SCHEMA_DOCS_URL } from '../../../routes';
import { SchemaLogic } from '../schema_logic';

export const EmptyState: React.FC = () => {
  const { isModalOpen } = useValues(SchemaLogic);
  const { addSchemaField, closeModal } = useActions(SchemaLogic);

  return (
    <>
      <EuiEmptyPrompt
        iconType="database"
        title={
          <h2>
            {i18n.translate('xpack.enterpriseSearch.appSearch.engine.schema.empty.title', {
              defaultMessage: 'Create a schema',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.enterpriseSearch.appSearch.engine.schema.empty.description', {
              defaultMessage:
                'Create schema fields in advance, or index some documents and a schema will be created for you.',
            })}
          </p>
        }
        actions={
          <EuiButton size="s" target="_blank" iconType="popout" href={INDEXING_SCHEMA_DOCS_URL}>
            {i18n.translate('xpack.enterpriseSearch.appSearch.engine.schema.empty.buttonLabel', {
              defaultMessage: 'Read the indexing schema guide',
            })}
          </EuiButton>
        }
      />
      {isModalOpen && (
        <SchemaAddFieldModal addNewField={addSchemaField} closeAddFieldModal={closeModal} />
      )}
    </>
  );
};
