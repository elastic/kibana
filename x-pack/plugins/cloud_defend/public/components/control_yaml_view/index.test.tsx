/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@kbn/kibana-react-plugin/public/code_editor/code_editor.test.helpers';
import { TestProvider } from '../../test/test_provider';
import { getCloudDefendNewPolicyMock, MOCK_YAML_INVALID_CONFIGURATION } from '../../test/mocks';
import { ControlYamlView } from '.';

describe('<ControlYamlView />', () => {
  const onChange = jest.fn();

  const WrappedComponent = ({ policy = getCloudDefendNewPolicyMock() }) => {
    return (
      <TestProvider>
        <ControlYamlView policy={policy} onChange={onChange} show />;
      </TestProvider>
    );
  };

  beforeEach(() => {
    onChange.mockClear();
  });

  it('handles invalid yaml', async () => {
    render(
      <WrappedComponent policy={getCloudDefendNewPolicyMock(MOCK_YAML_INVALID_CONFIGURATION)} />
    );
  });
});
