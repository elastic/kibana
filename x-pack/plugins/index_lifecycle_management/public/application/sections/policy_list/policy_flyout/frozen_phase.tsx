/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { SearchableSnapshot } from './searchable_snapshot';
import { SerializedFrozenPhase } from '../../../../../common/types';

import { i18nTexts } from '../../edit_policy/i18n_texts';
import { MinAge } from './min_age';

export const FrozenPhase = ({ phase }: { phase: SerializedFrozenPhase }) => {
  return (
    <>
      <EuiTitle size="s">
        <h2>{i18nTexts.editPolicy.titles.frozen}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <MinAge minAge={phase.min_age} />
      <SearchableSnapshot searchableSnapshot={phase.actions.searchable_snapshot} />
    </>
  );
};
