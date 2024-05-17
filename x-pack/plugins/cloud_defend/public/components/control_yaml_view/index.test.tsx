import { render } from '@testing-library/react';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import '@kbn/code-editor-mock/jest_helper';
import { ControlYamlView } from '.';
import { MAX_SELECTORS_AND_RESPONSES_PER_TYPE } from '../../common/constants';
import {
  MOCK_YAML_INVALID_ACTIONS,
  MOCK_YAML_INVALID_CONFIGURATION,
  MOCK_YAML_INVALID_STRING_ARRAY_CONDITION,
  MOCK_YAML_TOO_MANY_FILE_SELECTORS_RESPONSES,
  getCloudDefendNewPolicyMock,
} from '../../test/mocks';
import { TestProvider } from '../../test/test_provider';
import * as i18n from './translations';

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

  it('handles additionalErrors: max selectors+responses exceeded ', async () => {
    const { getByText, getByTestId } = render(
      <WrappedComponent
        policy={getCloudDefendNewPolicyMock(MOCK_YAML_TOO_MANY_FILE_SELECTORS_RESPONSES)}
      />
    );

    expect(getByTestId('cloudDefendAdditionalErrors')).toBeTruthy();
    expect(
      getByText(
        `You cannot exceed ${MAX_SELECTORS_AND_RESPONSES_PER_TYPE} selectors + responses for a given type e.g file, process`
      )
    ).toBeTruthy();
  });

  it('handles additionalErrors: block action error', async () => {
    const { getByText, getByTestId } = render(
      <WrappedComponent policy={getCloudDefendNewPolicyMock(MOCK_YAML_INVALID_ACTIONS)} />
    );

    expect(getByTestId('cloudDefendAdditionalErrors')).toBeTruthy();
    expect(getByText(i18n.errorAlertActionRequired)).toBeTruthy();
  });

  it('handles additionalErrors: selector condition value byte length', async () => {
    const { getByText, getByTestId } = render(
      <WrappedComponent
        policy={getCloudDefendNewPolicyMock(MOCK_YAML_INVALID_STRING_ARRAY_CONDITION)}
      />
    );

    expect(getByTestId('cloudDefendAdditionalErrors')).toBeTruthy();
    expect(getByText('"targetFilePath" values cannot exceed 255 bytes')).toBeTruthy();
  });
});
