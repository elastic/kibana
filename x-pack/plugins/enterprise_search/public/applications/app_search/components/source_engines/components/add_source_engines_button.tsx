/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiButton } from '@elastic/eui';

import { ADD_SOURCE_ENGINES_BUTTON_LABEL } from '../i18n';
import { SourceEnginesLogic } from '../source_engines_logic';

export const AddSourceEnginesButton: React.FC = () => {
  const { openModal } = useActions(SourceEnginesLogic);

  return (
    <EuiButton color="secondary" fill onClick={openModal}>
      {ADD_SOURCE_ENGINES_BUTTON_LABEL}
    </EuiButton>
  );
};
