/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPageHeader, EuiPageContentBody } from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { getEngineBreadcrumbs } from '../engine';

import { SYNONYMS_TITLE } from './constants';

export const Synonyms: React.FC = () => {
  return (
    <>
      <SetPageChrome trail={getEngineBreadcrumbs([SYNONYMS_TITLE])} />
      <EuiPageHeader pageTitle={SYNONYMS_TITLE} />
      <FlashMessages />
      <EuiPageContentBody>TODO</EuiPageContentBody>
    </>
  );
};
