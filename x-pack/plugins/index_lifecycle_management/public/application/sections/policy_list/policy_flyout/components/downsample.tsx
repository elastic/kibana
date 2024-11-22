/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PhaseWithDownsample } from '../../../../../../common/types';
import { i18nTexts } from '../../../edit_policy/i18n_texts';
import { ActionDescription } from './action_description';
import type { ActionComponentProps } from './types';

export const Downsample = ({ phase, phases }: ActionComponentProps) => {
  const downsample = phases[phase as PhaseWithDownsample]?.actions.downsample;
  return downsample ? (
    <ActionDescription
      title={i18nTexts.editPolicy.downsampleLabel}
      descriptionItems={[
        <>
          {`${i18nTexts.editPolicy.downsampleIntervalFieldLabel}: `}
          <strong>{downsample.fixed_interval}</strong>
        </>,
      ]}
    />
  ) : null;
};
