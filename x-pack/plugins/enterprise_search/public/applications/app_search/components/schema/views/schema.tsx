/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SchemaAddFieldModal } from '../../../../shared/schema';
import { getEngineBreadcrumbs } from '../../engine';
import { AppSearchPageTemplate } from '../../layout';

import { SchemaCallouts, SchemaTable, EmptyState } from '../components';
import { SCHEMA_TITLE } from '../constants';
import { SchemaLogic } from '../schema_logic';

export const Schema: React.FC = () => {
  const { loadSchema, updateSchema, addSchemaField, openModal, closeModal } =
    useActions(SchemaLogic);
  const { dataLoading, isUpdating, hasSchema, hasSchemaChanged, isModalOpen } =
    useValues(SchemaLogic);

  useEffect(() => {
    loadSchema();
  }, []);

  return (
    <AppSearchPageTemplate
      pageChrome={getEngineBreadcrumbs([SCHEMA_TITLE])}
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.appSearch.engine.schema.pageTitle', {
          defaultMessage: 'Manage engine schema',
        }),
        description: i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.schema.pageDescription',
          { defaultMessage: 'Add new fields or change the types of existing ones.' }
        ),
        rightSideItems: [
          <EuiButton
            fill
            disabled={!hasSchemaChanged}
            isLoading={isUpdating}
            onClick={() => updateSchema()}
            data-test-subj="updateSchemaButton"
          >
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.schema.updateSchemaButtonLabel',
              { defaultMessage: 'Save changes' }
            )}
          </EuiButton>,
          <EuiButton
            color="secondary"
            iconType="plusInCircle"
            disabled={isUpdating}
            onClick={openModal}
            data-test-subj="addSchemaFieldModalButton"
          >
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.schema.createSchemaFieldButtonLabel',
              { defaultMessage: 'Create a schema field' }
            )}
          </EuiButton>,
        ],
      }}
      isLoading={dataLoading}
      isEmptyState={!hasSchema}
      emptyState={<EmptyState />}
    >
      <SchemaCallouts />
      <SchemaTable />
      {isModalOpen && (
        <SchemaAddFieldModal addNewField={addSchemaField} closeAddFieldModal={closeModal} />
      )}
    </AppSearchPageTemplate>
  );
};
