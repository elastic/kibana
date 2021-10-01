/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBoxOptionOption } from '@elastic/eui';
import { Meta, Story } from '@storybook/react';
import React from 'react';
import { CoreStart } from '../../../../../../../src/core/public';
import { createKibanaReactContext } from '../../../../../../../src/plugins/kibana_react/public';
import { createCallApmApi } from '../../../services/rest/createCallApmApi';
import { SuggestionsSelect } from './';

interface Args {
  allOption: EuiComboBoxOptionOption<string>;
  customOptionText: string;
  field: string;
  placeholder: string;
  terms: string[];
}

const stories: Meta<Args> = {
  title: 'shared/SuggestionsSelect',
  component: SuggestionsSelect,
  decorators: [
    (StoryComponent, { args }) => {
      const { terms } = args;

      const coreMock = {
        http: {
          get: () => {
            return { terms };
          },
        },
        notifications: { toasts: { add: () => {} } },
        uiSettings: { get: () => true },
      } as unknown as CoreStart;

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

export const Example: Story<Args> = ({
  allOption,
  customOptionText,
  field,
  placeholder,
}) => {
  return (
    <SuggestionsSelect
      allOption={allOption}
      customOptionText={customOptionText}
      field={field}
      onChange={() => {}}
      placeholder={placeholder}
    />
  );
};
Example.args = {
  allOption: { label: 'All the things', value: 'ALL_THE_THINGS' },
  terms: ['thing1', 'thing2'],
  customOptionText: 'Add {searchValue} as a new thing',
  field: 'test.field',
  placeholder: 'Select thing',
};
