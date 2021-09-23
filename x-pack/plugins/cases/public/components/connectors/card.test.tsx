/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { ConnectorTypes } from '../../../common';
import { useKibana } from '../../common/lib/kibana';
import { actionTypeRegistryMock } from '../../../../triggers_actions_ui/public/application/action_type_registry.mock';
import { connectors } from '../configure_cases/__mock__';
import { ConnectorCard } from './card';

jest.mock('../../common/lib/kibana');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('ConnectorCard ', () => {
  const { createMockActionTypeModel } = actionTypeRegistryMock;

  beforeAll(() => {
    connectors.forEach((connector) =>
      useKibanaMock().services.triggersActionsUi.actionTypeRegistry.register(
        createMockActionTypeModel({ id: connector.actionTypeId, iconClass: 'logoSecurity' })
      )
    );
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
