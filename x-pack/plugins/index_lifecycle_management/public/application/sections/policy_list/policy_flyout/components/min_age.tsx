/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18nTexts } from '../../../edit_policy/i18n_texts';
import { ActionDescription } from './action_description';
import type { ActionComponentProps } from './types';

export const MinAge = ({ phase, phases }: ActionComponentProps) => {
  const minAge = phases[phase]?.min_age;
  return minAge ? (
    <ActionDescription
      title={i18nTexts.editPolicy.minAgeLabel}
      descriptionItems={[`${minAge} ${i18nTexts.editPolicy.minAgeUnitFieldSuffix}`]}
    />
  ) : null;
};
