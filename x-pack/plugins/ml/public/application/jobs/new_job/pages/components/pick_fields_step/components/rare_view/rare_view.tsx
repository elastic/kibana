/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';

import { RareDetectors } from './metric_selection';
import { RareDetectorsSummary } from './metric_selection_summary';
import { RareSettings } from './settings';

interface Props {
  isActive: boolean;
  setCanProceed?: (proceed: boolean) => void;
}

export const RareView: FC<Props> = ({ isActive, setCanProceed }) => {
  const [rareFieldValid, setRareFieldValid] = useState(false);
  const [settingsValid, setSettingsValid] = useState(false);

  useEffect(() => {
    if (typeof setCanProceed === 'function') {
      setCanProceed(rareFieldValid && settingsValid);
    }
  }, [rareFieldValid, settingsValid]);

  return isActive === false ? (
    <RareDetectorsSummary />
  ) : (
    <>
      <RareDetectors setIsValid={setRareFieldValid} />
      {rareFieldValid && (
        <>
          <EuiHorizontalRule margin="l" />
          <RareSettings setIsValid={setSettingsValid} />
        </>
      )}
    </>
  );
};
