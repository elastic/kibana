/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { SerializedDeletePhase } from '../../../../../common/types';

import { i18nTexts } from '../../edit_policy/i18n_texts';
import { MinAge } from './min_age';
import { WaitForSnapshot } from './wait_for_snapshot';

export const DeletePhase = ({ phase }: { phase: SerializedDeletePhase }) => {
  return (
    <>
      <EuiTitle size="s">
        <h2>{i18nTexts.editPolicy.titles.delete}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <MinAge minAge={phase.min_age} />
      <WaitForSnapshot waitForSnapshot={phase.actions.wait_for_snapshot} />
    </>
  );
};
