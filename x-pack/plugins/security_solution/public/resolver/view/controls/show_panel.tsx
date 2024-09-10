/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { StyledEuiButtonIcon } from './styles';
import { useColors } from '../use_colors';

export const ShowPanelButton = memo(({ showPanelOnClick }: { showPanelOnClick: () => void }) => {
  const colorMap = useColors();

  return (
    <StyledEuiButtonIcon
      data-test-subj="resolver:graph-controls:show-panel-button"
      size="m"
      title={'panel'}
      aria-label={'open panel'}
      onClick={showPanelOnClick}
      iconType={'eye'}
      $backgroundColor={colorMap.graphControlsBackground}
      $iconColor={colorMap.graphControls}
      $borderColor={colorMap.graphControlsBorderColor}
    />
  );
});

ShowPanelButton.displayName = 'ShowPanelButton';
