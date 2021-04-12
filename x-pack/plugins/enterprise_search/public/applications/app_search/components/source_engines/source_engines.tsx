/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiCodeBlock, EuiPageHeader } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';

import { Loading } from '../../../shared/loading';

import { SourceEnginesLogic } from './source_engines_logic';

const SOURCE_ENGINES_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.souceEngines.title',
  {
    defaultMessage: 'Manage Engines',
  }
);

interface Props {
  engineBreadcrumb: string[];
}

export const SourceEngines: React.FC<Props> = ({ engineBreadcrumb }) => {
  const { fetchSourceEngines } = useActions(SourceEnginesLogic);
  const { dataLoading, sourceEngines } = useValues(SourceEnginesLogic);

  useEffect(() => {
    fetchSourceEngines();
  }, []);

  if (dataLoading) return <Loading />;

  return (
    <div>
      <SetPageChrome trail={[...engineBreadcrumb, SOURCE_ENGINES_TITLE]} />
      <EuiPageHeader pageTitle={SOURCE_ENGINES_TITLE} />
      <FlashMessages />
      <EuiCodeBlock language="json">{JSON.stringify(sourceEngines, null, 2)}</EuiCodeBlock>
    </div>
  );
};
