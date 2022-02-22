/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { ThemeProvider } from 'styled-components';
import { storiesOf, addDecorator } from '@storybook/react';
import { euiLightVars } from '@kbn/ui-theme';

import { ViewType } from '../../../state';
import { ViewTypeToggle } from '.';

addDecorator((storyFn) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
));

const useRenderStory = (viewType: ViewType) => {
  const [selectedOption, setSelectedOption] = useState<ViewType>(viewType);

  return <ViewTypeToggle selectedOption={selectedOption} onToggle={setSelectedOption} />;
};

storiesOf('TrustedApps/ViewTypeToggle', module)
  .add('grid selected', () => useRenderStory('grid'))
  .add('list selected', () => useRenderStory('list'));
