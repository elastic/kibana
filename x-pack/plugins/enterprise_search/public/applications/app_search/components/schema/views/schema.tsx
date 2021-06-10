/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import { EuiPageHeader, EuiButton, EuiPageContentBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../../shared/flash_messages';
import { Loading } from '../../../../shared/loading';
import { SchemaAddFieldModal } from '../../../../shared/schema';

import { SchemaCallouts, SchemaTable, EmptyState } from '../components';
import { SchemaLogic } from '../schema_logic';

export const Schema: React.FC = () => {
  const { loadSchema, updateSchema, addSchemaField, openModal, closeModal } = useActions(
    SchemaLogic
  );
  const { dataLoading, isUpdating, hasSchema, hasSchemaChanged, isModalOpen } = useValues(
    SchemaLogic
  );

  useEffect(() => {
    loadSchema();
  }, []);

  if (dataLoading) return <Loading />;

  return (
    <>
      <EuiPageHeader
        pageTitle={i18n.translate('xpack.enterpriseSearch.appSearch.engine.schema.pageTitle', {
          defaultMessage: 'Manage engine schema',
        })}
        description={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.schema.pageDescription',
          { defaultMessage: 'Add new fields or change the types of existing ones.' }
        )}
        rightSideItems={[
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
            disabled={isUpdating}
            onClick={openModal}
            iconType="plusInCircleFilled"
            data-test-subj="addSchemaFieldModalButton"
          >
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.schema.createSchemaFieldButtonLabel',
              { defaultMessage: 'Create a schema field' }
            )}
          </EuiButton>,
        ]}
      />
      <FlashMessages />
      <EuiPageContentBody>
        <SchemaCallouts />
        {hasSchema ? <SchemaTable /> : <EmptyState />}
        {isModalOpen && (
          <SchemaAddFieldModal addNewField={addSchemaField} closeAddFieldModal={closeModal} />
        )}
      </EuiPageContentBody>
    </>
  );
};
