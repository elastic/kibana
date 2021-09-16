/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React from 'react';
import { CoreStart } from '../../../../../../../../src/core/public';
import { createKibanaReactContext } from '../../../../../../../../src/plugins/kibana_react/public';
import { createCallApmApi } from '../../../../services/rest/createCallApmApi';
import { EnvironmentsSelect } from './';

interface Args {
  environments: string[];
}

const stories: Meta<Args> = {
  title: 'shared/selects/EnvironmentsSelect',
  component: EnvironmentsSelect,
  decorators: [
    (StoryComponent, { args }) => {
      const { environments } = args;

      const coreMock = ({
        http: {
          get: () => {
            return { environments };
          },
        },
        notifications: { toasts: { add: () => {} } },
        uiSettings: { get: () => true },
      } as unknown) as CoreStart;

      const KibanaReactContext = createKibanaReactContext(coreMock);

      createCallApmApi(coreMock);

      return (
        <KibanaReactContext.Provider>
          <StoryComponent />
        </KibanaReactContext.Provider>
      );
    },
  ],
};
export default stories;

export const Example: Story<Args> = (args) => {
  return <EnvironmentsSelect onChange={() => {}} />;
};
Example.args = {
  environments: ['staging', 'production'],
};
