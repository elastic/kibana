/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPageHeader, EuiPageContentBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../../shared/flash_messages';

export const MetaEngineSchema: React.FC = () => {
  return (
    <>
      <EuiPageHeader
        pageTitle={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.schema.metaEngine.title',
          { defaultMessage: 'Meta engine schema' }
        )}
        description={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.schema.metaEngine.description',
          { defaultMessage: 'Active and inactive fields, by engine.' }
        )}
      />
      <FlashMessages />
      <EuiPageContentBody>TODO</EuiPageContentBody>
    </>
  );
};
