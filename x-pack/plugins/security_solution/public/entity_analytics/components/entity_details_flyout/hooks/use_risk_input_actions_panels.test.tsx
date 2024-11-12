/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiContextMenu } from '@elastic/eui';
import { casesPluginMock } from '@kbn/cases-plugin/public/mocks';
import { render, renderHook } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { alertInputDataMock } from '../mocks';
import { useRiskInputActionsPanels } from './use_risk_input_actions_panels';

const casesServiceMock = casesPluginMock.createStartContract();
const mockCanUseCases = jest.fn().mockReturnValue({
  create: true,
  read: true,
});

const mockedCasesServices = {
  ...casesServiceMock,
  helpers: {
    ...casesServiceMock.helpers,
    canUseCases: mockCanUseCases,
  },
};

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        cases: mockedCasesServices,
      },
    }),
  };
});

const TestMenu = ({ panels }: { panels: EuiContextMenuPanelDescriptor[] }) => (
  <EuiContextMenu initialPanelId={0} panels={panels} />
);

const customRender = (alerts = [alertInputDataMock]) => {
  const { result } = renderHook(() => useRiskInputActionsPanels(alerts, () => {}), {
    wrapper: TestProviders,
  });

  return render(
    <TestProviders>
      <TestMenu panels={result.current} />
    </TestProviders>
  );
};

describe('useRiskInputActionsPanels', () => {
  it('displays the rule name when only one alert is selected', () => {
    const { getByTestId } = customRender();

    expect(getByTestId('contextMenuPanelTitle')).toHaveTextContent('Risk input: Rule Name');
  });

  it('displays number of selected alerts when more than one alert is selected', () => {
    const { getByTestId } = customRender([alertInputDataMock, alertInputDataMock]);

    expect(getByTestId('contextMenuPanelTitle')).toHaveTextContent('2 selected');
  });

  it('displays cases actions when user has cases permissions', () => {
    const { container } = customRender();

    expect(container).toHaveTextContent('Add to existing case');
    expect(container).toHaveTextContent('Add to new case');
  });

  it('does NOT display cases actions when user has NO cases permissions', () => {
    mockCanUseCases.mockReturnValue({
      create: false,
      read: false,
    });

    const { container } = customRender();

    expect(container).not.toHaveTextContent('Add to existing case');
    expect(container).not.toHaveTextContent('Add to new case');
  });
});
