/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { setAngularState, getSetupModeState, initSetupModeState, updateSetupModeData } from '../../lib/setup_mode';

export const SetupModeRenderer = ({ render, scope, injector }) => {
  const [renderState, forceRender] = useState(false);

  let count = 0;
  useEffect(() => {
    console.log('useEffect', { count });
    if (++count >= 10) {
      return;
    }
    setAngularState(scope, injector);
    initSetupModeState(() => forceRender(!renderState));
  }, [null]); // eslint-disable-line

  const setupModeState = getSetupModeState();
  return render({
    setupMode: {
      data: setupModeState.data,
      enabled: setupModeState.enabled,
      updateSetupModeData,
    }
  });
};
