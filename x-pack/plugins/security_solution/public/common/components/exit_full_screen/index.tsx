/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiWindowEvent } from '@elastic/eui';
import React, { useCallback } from 'react';

import { useFullScreen } from '../../../common/containers/use_full_screen';

import * as i18n from './translations';

export const ExitFullScreen: React.FC = () => {
  const { globalFullScreen, setGlobalFullScreen } = useFullScreen();

  const exitFullScreen = useCallback(() => {
    setGlobalFullScreen(false);
  }, [setGlobalFullScreen]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();

        exitFullScreen();
      }
    },
    [exitFullScreen]
  );

  if (!globalFullScreen) {
    return null;
  }

  return (
    <>
      <EuiWindowEvent event="keydown" handler={onKeyDown} />
      <EuiButton
        data-test-subj="exit-full-screen"
        iconType="fullScreen"
        isDisabled={!globalFullScreen}
        onClick={exitFullScreen}
      >
        {i18n.EXIT_FULL_SCREEN}
      </EuiButton>
    </>
  );
};
