/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { ConnectorSelector } from './form';
import { useKibana } from '../../common/lib/kibana';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FormTestComponent } from '../../common/test_utils';
import { connectorsMock } from '../../containers/mock';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

// FLAKY: https://github.com/elastic/kibana/issues/189530
describe.skip('ConnectorSelector', () => {
  const handleChange = jest.fn();
  const defaultProps = {
    connectors: [],
    handleChange,
    dataTestSubj: 'connectors',
    disabled: false,
    idAria: 'connectors',
    isLoading: false,
  };

  let appMock: AppMockRenderer;

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  beforeEach(() => {
    useKibanaMock().services.triggersActionsUi.actionTypeRegistry.get = jest.fn().mockReturnValue({
      actionTypeTitle: 'test',
      iconClass: 'logoSecurity',
    });
  });

  it('should render', async () => {
    appMock.render(
      <FormTestComponent>
        <UseField
          path="connectorId"
          component={ConnectorSelector}
          componentProps={{
            ...defaultProps,
          }}
        />
      </FormTestComponent>
    );

    expect(await screen.findByTestId(defaultProps.dataTestSubj));
  });

  it('should set the selected connector to none if the connector is not available', async () => {
    appMock.render(
      <FormTestComponent formDefaultValue={{ connectorId: 'foo' }}>
        <UseField
          path="connectorId"
          component={ConnectorSelector}
          componentProps={{
            ...defaultProps,
          }}
        />
      </FormTestComponent>
    );

    expect(await screen.findByText('No connector selected'));
  });

  it('should set the selected connector correctly', async () => {
    appMock.render(
      <FormTestComponent formDefaultValue={{ connectorId: connectorsMock[0].id }}>
        <UseField
          path="connectorId"
          component={ConnectorSelector}
          componentProps={{
            ...defaultProps,
            connectors: connectorsMock,
          }}
        />
      </FormTestComponent>
    );

    expect(await screen.findByText(connectorsMock[0].name));
  });
});
