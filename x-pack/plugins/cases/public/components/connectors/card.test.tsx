/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { ConnectorTypes } from '../../../common/api';
import { ConnectorCard } from './card';

describe('ConnectorCard ', () => {
  it('it does not throw when accessing the icon if the connector type is not registered', () => {
    expect(() =>
      mount(
        <ConnectorCard
          connectorType={ConnectorTypes.none}
          title="None"
          listItems={[]}
          isLoading={false}
        />
      )
    ).not.toThrowError();
  });
});
