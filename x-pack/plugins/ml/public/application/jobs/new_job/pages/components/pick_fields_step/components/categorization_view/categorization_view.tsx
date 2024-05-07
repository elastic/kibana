/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';

import { CategorizationDetectors } from './metric_selection';
import { CategorizationDetectorsSummary } from './metric_selection_summary';
import { CategorizationSettings } from './settings';

interface Props {
  isActive: boolean;
  setCanProceed?: (proceed: boolean) => void;
}

export const CategorizationView: FC<Props> = ({ isActive, setCanProceed }) => {
  const [categoryFieldValid, setCategoryFieldValid] = useState(false);
  const [settingsValid, setSettingsValid] = useState(false);

  useEffect(() => {
    if (typeof setCanProceed === 'function') {
      setCanProceed(categoryFieldValid && settingsValid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFieldValid, settingsValid]);

  return isActive === false ? (
    <CategorizationDetectorsSummary />
  ) : (
    <>
      <CategorizationDetectors setIsValid={setCategoryFieldValid} />
      {categoryFieldValid && (
        <>
          <EuiHorizontalRule margin="l" />
          <CategorizationSettings setIsValid={setSettingsValid} />
        </>
      )}
    </>
  );
};
