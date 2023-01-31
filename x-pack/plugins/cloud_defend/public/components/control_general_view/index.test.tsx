/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import yaml from 'js-yaml';
import { render, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import userEvent from '@testing-library/user-event';
import { TestProvider } from '../../test/test_provider';
import { getCloudDefendNewPolicyMock, MOCK_YAML_INVALID_CONFIGURATION } from '../../test/mocks';
import { ControlGeneralView } from '.';
import { getInputFromPolicy } from '../../common/utils';
import { INPUT_CONTROL } from '../../../common/constants';

describe('<ControlGeneralView />', () => {
  const onChange = jest.fn();

  // defining this here to avoid a warning in testprovider with params.history changing on rerender.
  const params = coreMock.createAppMountParameters();

  const WrappedComponent = ({ policy = getCloudDefendNewPolicyMock() }) => {
    return (
      <TestProvider params={params}>
        <ControlGeneralView policy={policy} onChange={onChange} show />;
      </TestProvider>
    );
  };

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders a list of selectors and responses', () => {
    const { getAllByTestId } = render(<WrappedComponent />);

    const input = getInputFromPolicy(getCloudDefendNewPolicyMock(), INPUT_CONTROL);
    const configuration = input?.vars?.configuration?.value;

    try {
      const json = yaml.load(configuration);

      expect(json.selectors.length).toBe(getAllByTestId('cloud-defend-selector').length);
      expect(json.responses.length).toBe(getAllByTestId('cloud-defend-response').length);
      expect(json.selectors.length).toBe(3);
      expect(json.responses.length).toBe(2);
    } catch (err) {
      throw err;
    }
  });

  it('allows a user to add a new selector and new response', async () => {
    const { getAllByTestId, getByTestId, rerender } = render(<WrappedComponent />);

    userEvent.click(getByTestId('cloud-defend-btnaddselector'));
    userEvent.click(getByTestId('cloud-defend-btnaddresponse'));

    const policy = onChange.mock.calls[0][0].updatedPolicy;

    rerender(<WrappedComponent policy={policy} />);

    const input = getInputFromPolicy(policy, INPUT_CONTROL);
    const configuration = input?.vars?.configuration?.value;

    try {
      const json = yaml.load(configuration);

      expect(json.selectors.length).toBe(getAllByTestId('cloud-defend-selector').length);
      expect(json.responses.length).toBe(getAllByTestId('cloud-defend-response').length);
      expect(json.selectors.length).toBe(4);
      expect(json.responses.length).toBe(3);
    } catch (err) {
      throw err;
    }
  });

  it('updates selector name used in response.match, if its name is changed', async () => {
    const { getByTitle, getAllByTestId, rerender } = render(<WrappedComponent />);

    const input = await waitFor(
      () => getAllByTestId('cloud-defend-selectorcondition-name')[1] as HTMLInputElement
    );

    userEvent.type(input, '2');

    const policy = onChange.mock.calls[0][0].updatedPolicy;
    rerender(<WrappedComponent policy={policy} />);

    expect(getByTitle('Remove nginxOnly2 from selection in this group')).toBeTruthy(); // would be 'nginxOnly' had the update not worked
  });

  it('updates selector name used in response.exclude, if its name is changed', async () => {
    const { getByTitle, getAllByTestId, rerender } = render(<WrappedComponent />);

    const input = await waitFor(
      () => getAllByTestId('cloud-defend-selectorcondition-name')[2] as HTMLInputElement
    );

    userEvent.type(input, '3');

    const policy = onChange.mock.calls[0][0].updatedPolicy;

    rerender(<WrappedComponent policy={policy} />);

    expect(getByTitle('Remove excludeCustomNginxBuild3 from selection in this group')).toBeTruthy();
  });

  it('doesnt blow up if invalid yaml passed in', async () => {
    const { queryAllByTestId } = render(
      <WrappedComponent policy={getCloudDefendNewPolicyMock(MOCK_YAML_INVALID_CONFIGURATION)} />
    );

    expect(queryAllByTestId('cloud-defend-selector')).toHaveLength(0);
    expect(queryAllByTestId('cloud-defend-response')).toHaveLength(0);
  });
});
