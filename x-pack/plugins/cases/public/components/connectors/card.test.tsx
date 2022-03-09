/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { ConnectorTypes } from '../../../common/api';
import { useKibana } from '../../common/lib/kibana';
import { connectors } from '../configure_cases/__mock__';
import { ConnectorCard } from './card';
import { registerConnectorsToMockActionRegistry } from '../../common/mock/register_connectors';

jest.mock('../../common/lib/kibana');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('ConnectorCard ', () => {
  const actionTypeRegistry = useKibanaMock().services.triggersActionsUi.actionTypeRegistry;

  beforeAll(() => {
    registerConnectorsToMockActionRegistry(actionTypeRegistry, connectors);
  });

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
