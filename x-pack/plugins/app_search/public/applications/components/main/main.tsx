/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { SetupGuide } from '../setup_guide';
import { EngineOverview } from '../engine_overview';

interface IMainProps {
  appSearchUrl?: string;
}

export const Main: React.FC<IMainProps> = props => {
  const [showSetupGuide, showSetupGuideFlag] = useState(!props.appSearchUrl);

  return showSetupGuide ? (
    <SetupGuide {...props} />
  ) : (
    <EngineOverview {...props} showSetupGuideFlag={showSetupGuideFlag} />
  );
};
