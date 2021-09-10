/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { CoreStart } from '../../../../../../../../src/core/public';
import { createKibanaReactContext } from '../../../../../../../../src/plugins/kibana_react/public';
import { createCallApmApi } from '../../../../services/rest/createCallApmApi';
import { EnvironmentSelect } from './';

interface Args {
  environments: Array<{ name: string }>;
}

const stories: Meta<Args> = {
  title: 'shared/selects/EnvironmentSelect',
  component: EnvironmentSelect,
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
  return <EnvironmentSelect onChange={() => {}} />;
};
Example.args = {
  environments: [
    { name: 'ALL_OPTION_VALUE' },
    { name: 'staging' },
    { name: 'production' },
  ],
};
