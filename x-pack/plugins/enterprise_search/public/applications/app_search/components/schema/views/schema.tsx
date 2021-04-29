/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPageHeader, EuiButton, EuiPageContentBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../../shared/flash_messages';

export const Schema: React.FC = () => {
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
          <EuiButton fill>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.schema.updateSchemaButtonLabel',
              { defaultMessage: 'Update types' }
            )}
          </EuiButton>,
          <EuiButton color="secondary">
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.schema.createSchemaFieldButtonLabel',
              { defaultMessage: 'Create a schema field' }
            )}
          </EuiButton>,
        ]}
      />
      <FlashMessages />
      <EuiPageContentBody>TODO</EuiPageContentBody>
    </>
  );
};
