/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addDecorator } from '@storybook/react';
// @ts-expect-error
import { withInfo } from '@storybook/addon-info';
import { Provider as ReduxProvider } from 'react-redux';

import { ServicesProvider } from '../../public/services';
import { RouterContext } from '../../public/components/router';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';

import { routerContextDecorator } from './router_decorator';
import { kibanaContextDecorator } from './kibana_decorator';
import { servicesContextDecorator } from './services_decorator';

export { reduxDecorator } from './redux_decorator';

export const addDecorators = () => {
  if (process.env.NODE_ENV === 'test') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('babel-plugin-require-context-hook/register')();
  } else {
    // Customize the info for each story.
    addDecorator(
      withInfo({
        inline: true,
        styles: {
          infoBody: {
            margin: 20,
          },
          infoStory: {
            margin: '40px 60px',
          },
        },
        propTablesExclude: [ReduxProvider, ServicesProvider, RouterContext, KibanaContextProvider],
      })
    );
  }

  addDecorator(kibanaContextDecorator);
  addDecorator(routerContextDecorator);
  addDecorator(servicesContextDecorator);
};
