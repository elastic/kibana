/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { ThemeProvider } from 'styled-components';
import { storiesOf, addDecorator } from '@storybook/react';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { ControlPanel, ControlPanelProps } from '.';
import { ViewType } from '../../../state';

addDecorator((storyFn) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
));

const useRenderStory = (state: ControlPanelProps['state']) => {
  const [selectedOption, setSelectedOption] = useState<ViewType>(state.currentViewType);

  return (
    <ControlPanel
      state={{ ...state, currentViewType: selectedOption }}
      onViewTypeChange={setSelectedOption}
    />
  );
};

storiesOf('TrustedApps/ControlPanel', module)
  .add('list view selected', () => {
    return useRenderStory({ totalItemsCount: 0, currentViewType: 'list' });
  })
  .add('plural totals', () => {
    return useRenderStory({ totalItemsCount: 200, currentViewType: 'grid' });
  })
  .add('singular totals', () => {
    return useRenderStory({ totalItemsCount: 1, currentViewType: 'grid' });
  });
