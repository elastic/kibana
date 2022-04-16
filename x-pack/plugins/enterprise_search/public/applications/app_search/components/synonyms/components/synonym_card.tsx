/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiText, EuiButton } from '@elastic/eui';

import { SynonymsLogic } from '..';
import { MANAGE_BUTTON_LABEL } from '../../../../shared/constants';

import { SynonymSet } from '../types';

import { SynonymIcon } from '.';

export const SynonymCard: React.FC<SynonymSet> = (synonymSet) => {
  const { openModal } = useActions(SynonymsLogic);

  const [firstSynonym, ...remainingSynonyms] = synonymSet.synonyms;

  return (
    <EuiCard
      display="subdued"
      title={firstSynonym}
      titleElement="h2"
      titleSize="s"
      textAlign="left"
      footer={
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton onClick={() => openModal(synonymSet)}>{MANAGE_BUTTON_LABEL}</EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <EuiText size="m">
        {remainingSynonyms.map((synonym) => (
          <div key={synonym}>
            <SynonymIcon /> {synonym}
          </div>
        ))}
      </EuiText>
    </EuiCard>
  );
};
