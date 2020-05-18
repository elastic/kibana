/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ThemeProvider } from 'styled-components';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { mockBrowserFields } from '../../common/containers/source/mock';
import { ExceptionItemComponent } from '../exception_item';
import { getMockExceptionItem } from '../../common/mock/exceptions';

storiesOf('exceptions', module).add('ExceptionItemComponent', () => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
    <ExceptionItemComponent
      idAria="someAriaId"
      exceptionItem={getMockExceptionItem('exception-item-1')}
      exceptionItemIndex={0}
      listType="siem"
      browserFields={mockBrowserFields}
      isAndLogicIncluded={true}
      indexPatternLoading={false}
      onChange={() => action('Entry change')}
      setAndLogicIncluded={() => {}}
      onDelete={() => action('Entry delete clicked')}
    />
  </ThemeProvider>
));
