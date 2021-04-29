/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { SourceEnginesLogic } from '../source_engines_logic';

export const AddSourceEnginesButton: React.FC = () => {
  const { openAddSourceEnginesModal } = useActions(SourceEnginesLogic);

  const BUTTON_LABEL = i18n.translate(
    'xpack.enterpriseSearch.appSearch.engine.souceEngines.addSourceEnginesButtonLabel',
    {
      defaultMessage: 'Add engines',
    }
  );

  return (
    <EuiButton color="secondary" fill onClick={openAddSourceEnginesModal}>
      {BUTTON_LABEL}
    </EuiButton>
  );
};
