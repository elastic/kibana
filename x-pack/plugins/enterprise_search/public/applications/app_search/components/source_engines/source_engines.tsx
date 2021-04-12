/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPageHeader } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';

const SOURCE_ENGINES_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.souceEngines.title',
  {
    defaultMessage: 'Manage Engines',
  }
);

interface Props {
  engineBreadcrumb: string[];
}

export const SourceEngines: React.FC<Props> = ({ engineBreadcrumb }) => (
  <div>
    <SetPageChrome trail={[...engineBreadcrumb, SOURCE_ENGINES_TITLE]} />
    <EuiPageHeader pageTitle={SOURCE_ENGINES_TITLE} />
    <FlashMessages />
  </div>
);
