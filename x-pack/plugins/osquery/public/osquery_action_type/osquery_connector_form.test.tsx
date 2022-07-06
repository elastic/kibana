/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { shallow } from 'enzyme';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import {
  ConnectorFormTestProvider,
  waitForComponentToUpdate,
} from '@kbn/triggers-actions-ui-plugin/public/application/components/builtin_action_types/test_utils';
import OsqueryConnectorForm from './osquery_connector_form';

jest.mock('../common/lib/kibana');
import * as hooks from '../fleet_integration/use_fetch_status';

const spyUseFetchStatus = jest.spyOn(hooks, 'useFetchStatus');

interface FetchStatus {
  loading: boolean;
  disabled: boolean;
  permissionDenied: boolean;
}

const spyOsqueryStatus = (data: FetchStatus) => {
  spyUseFetchStatus.mockImplementation(() => data);
};

const actionConnector = {
  id: 'osquery',
  actionTypeId: '.osquery',
  name: 'osquery',
  secrets: {
    user: 'user',
    password: 'pass',
  },
  config: {
    from: 'test@test.com',
    hasAuth: true,
  },
  isDeprecated: false,
};

describe('OsqueryConnectorForm', () => {
  test('should not render any prompt info if osquery is enabled', async () => {
    spyOsqueryStatus({
      loading: false,
      disabled: false,
      permissionDenied: false,
    });

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <OsqueryConnectorForm />
      </ConnectorFormTestProvider>
    );

    await waitForComponentToUpdate();

    const prompt = wrapper.find(EuiEmptyPrompt).first();

    expect(prompt).toHaveLength(0);
  });
  test('renders permission denied prompt', async () => {
    spyOsqueryStatus({
      loading: false,
      disabled: false,
      permissionDenied: true,
    });

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <OsqueryConnectorForm />
      </ConnectorFormTestProvider>
    );

    await waitForComponentToUpdate();

    const prompt = wrapper.find(EuiEmptyPrompt).first();

    expect(prompt).toHaveLength(1);

    const promptTitle = prompt.prop('title');
    const titleText = promptTitle && shallow(promptTitle).text();

    expect(titleText).toEqual('Permission denied');
  });
  test('renders disabled denied prompt', async () => {
    spyOsqueryStatus({
      loading: false,
      disabled: true,
      permissionDenied: false,
    });

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <OsqueryConnectorForm />
      </ConnectorFormTestProvider>
    );

    await waitForComponentToUpdate();

    const prompt = wrapper.find(EuiEmptyPrompt).first();

    expect(prompt).toHaveLength(1);

    const promptTitle = prompt.prop('title');
    const titleText = promptTitle && shallow(promptTitle).text();

    expect(titleText).toEqual('Osquery is not available');
  });
});
