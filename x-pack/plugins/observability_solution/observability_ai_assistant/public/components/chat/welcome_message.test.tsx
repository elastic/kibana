/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render as rtlRender } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { waitForEuiPopoverClose, waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { WelcomeMessage } from './welcome_message';
import { useKibana } from '../../hooks/use_kibana';
import type {
  MlDeploymentAllocationState,
  MlDeploymentState,
} from '@elastic/elasticsearch/lib/api/types';

jest.mock('../../hooks/use_kibana');

const useKibanaMock = useKibana as jest.Mock;
const navigateToApp = jest.fn();

const reloadConnectors = jest.fn();
const selectConnector = jest.fn();
const install = jest.fn().mockResolvedValue(undefined);
const refresh = jest.fn();

const baseKnowledgeBase = {
  install,
};

const emptyKnowledgeBase = {
  ...baseKnowledgeBase,
  status: { value: { ready: false }, loading: false, refresh },
  isInstalling: false,
  installError: undefined,
};

const installingKnowledgeBase = {
  ...baseKnowledgeBase,
  status: { value: { ready: false }, loading: false, refresh },
  isInstalling: true,
  installError: undefined,
};

const loadingKnowledgeBase = {
  ...baseKnowledgeBase,
  status: { value: { ready: false }, loading: true, refresh },
  isInstalling: false,
  installError: undefined,
};

const installedKnowledgeBase = {
  ...baseKnowledgeBase,
  status: {
    value: {
      ready: true,
      model_name: 'foo',
      deployment_state: 'started' as MlDeploymentState,
      allocation_state: 'allocated' as MlDeploymentAllocationState,
    },
    loading: false,
    refresh,
  },
  isInstalling: false,
  installError: undefined,
};

const baseConnectors = {
  reloadConnectors,
  selectConnector,
  loading: false,
};

const emptyConnectors = {
  ...baseConnectors,
  connectors: [],
};

const filledConnectors = {
  ...baseConnectors,
  connectors: [
    {
      id: 'test',
      actionTypeId: 'test',
      name: 'test',
      referencedByCount: 0,
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: false,
    },
  ],
};

const render = (component: React.ReactElement) => {
  return rtlRender(<IntlProvider locale="en">{component}</IntlProvider>);
};

const defaultMockServices = {
  services: {
    application: { navigateToApp, capabilities: {} },
    http: { basePath: { prepend: jest.fn((path: string) => `/${path}`) } },
    plugins: {
      start: {
        triggersActionsUi: {
          getAddConnectorFlyout: () => <button data-test-subj="connectorFlyout">hello</button>,
        },
      },
    },
  },
};

describe('Welcome Message', () => {
  beforeEach(() => {
    useKibanaMock.mockReturnValue(defaultMockServices);
  });

  describe('when no connectors are available', () => {
    it('should show a disclaimer', () => {
      const { getByTestId } = render(
        <WelcomeMessage connectors={emptyConnectors} knowledgeBase={emptyKnowledgeBase} />
      );

      expect(getByTestId('observabilityAiAssistantDisclaimer')).toBeInTheDocument();
    });

    it('should show a set up connector button', () => {
      const { getByTestId } = render(
        <WelcomeMessage connectors={emptyConnectors} knowledgeBase={emptyKnowledgeBase} />
      );

      expect(
        getByTestId('observabilityAiAssistantInitialSetupPanelSetUpGenerativeAiConnectorButton')
      ).toBeInTheDocument();
    });

    describe('when no triggersactionsUi capabilities are available', () => {
      it('should navigate to stack management', () => {
        const { getByTestId } = render(
          <WelcomeMessage connectors={emptyConnectors} knowledgeBase={emptyKnowledgeBase} />
        );

        fireEvent.click(
          getByTestId('observabilityAiAssistantInitialSetupPanelSetUpGenerativeAiConnectorButton')
        );

        expect(navigateToApp).toHaveBeenCalledWith('management', {
          path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
        });
      });
    });

    describe('when triggersactionsUi capabilities are available', () => {
      beforeEach(() => {
        useKibanaMock.mockReturnValue({
          services: {
            application: {
              navigateToApp,
              capabilities: {
                management: {
                  insightsAndAlerting: {
                    triggersActions: true,
                  },
                },
              },
            },
            plugins: {
              start: {
                triggersActionsUi: {
                  getAddConnectorFlyout: () => (
                    <button data-test-subj="connectorFlyout">hello</button>
                  ),
                },
              },
            },
          },
        });
      });

      it('should render a connector flyout when clicking the set up connector button', () => {
        const { getByTestId } = render(
          <WelcomeMessage connectors={emptyConnectors} knowledgeBase={emptyKnowledgeBase} />
        );

        fireEvent.click(
          getByTestId('observabilityAiAssistantInitialSetupPanelSetUpGenerativeAiConnectorButton')
        );

        expect(getByTestId('connectorFlyout')).toBeInTheDocument();
      });

      describe('when creating a new connector', () => {
        // it('should call reloadConnectors and install knowledge base', () => {
        //   const { getByTestId } = render(
        //     <WelcomeMessage connectors={emptyConnectors} knowledgeBase={emptyKnowledgeBase} />
        //   );
        //   fireEvent.click(
        //     getByTestId('observabilityAiAssistantInitialSetupPanelSetUpGenerativeAiConnectorButton')
        //   );
        //   fireEvent.click(getByTestId('connectorFlyout'));
        //   expect(reloadConnectors).toHaveBeenCalled();
        //   expect(install).toHaveBeenCalled();
        // });
        // it('should install the knowledge base', () => {
        //   const { getByTestId } = render(
        //     <WelcomeMessage connectors={emptyConnectors} knowledgeBase={emptyKnowledgeBase} />
        //   );
        //   fireEvent.click(
        //     getByTestId('observabilityAiAssistantInitialSetupPanelSetUpGenerativeAiConnectorButton')
        //   );
        //   fireEvent.click(getByTestId('connectorFlyout'));
        //   expect(install).toHaveBeenCalled();
        // });
      });
    });
  });

  describe('when connectors are available', () => {
    it('should show a disclaimer', () => {
      const { getByTestId } = render(
        <WelcomeMessage connectors={filledConnectors} knowledgeBase={emptyKnowledgeBase} />
      );

      expect(getByTestId('observabilityAiAssistantDisclaimer')).toBeInTheDocument();
    });

    describe('when knowledge base is not installed', () => {
      it('should render the retry and inspect errors buttons', () => {
        const { getByTestId } = render(
          <WelcomeMessage connectors={filledConnectors} knowledgeBase={emptyKnowledgeBase} />
        );

        expect(
          getByTestId('observabilityAiAssistantWelcomeMessageSetUpKnowledgeBaseButton')
        ).toBeInTheDocument();

        expect(
          getByTestId('observabilityAiAssistantWelcomeMessageInspectErrorsButton')
        ).toBeInTheDocument();
      });

      it('should call kb install when clicking retry', async () => {
        const { getByTestId } = render(
          <WelcomeMessage connectors={filledConnectors} knowledgeBase={emptyKnowledgeBase} />
        );

        await act(async () => {
          fireEvent.click(
            getByTestId('observabilityAiAssistantWelcomeMessageSetUpKnowledgeBaseButton')
          );
          expect(install).toBeCalled();
        });
      });

      it('should render a popover with installation errors when clicking inspect', async () => {
        const { getByTestId } = render(
          <WelcomeMessage connectors={filledConnectors} knowledgeBase={emptyKnowledgeBase} />
        );

        fireEvent.click(getByTestId('observabilityAiAssistantWelcomeMessageInspectErrorsButton'));

        await waitForEuiPopoverOpen();

        expect(
          getByTestId('observabilityAiAssistantWelcomeMessageKnowledgeBaseSetupErrorPanel')
        ).toBeInTheDocument();

        fireEvent.click(
          getByTestId(
            'observabilityAiAssistantWelcomeMessageKnowledgeBaseSetupErrorPanelRetryInstallingLink'
          )
        );

        await waitForEuiPopoverClose();

        expect(install).toBeCalled();
      });

      it('should navigate to ML when clicking the link in the error popover', async () => {
        const { getByTestId } = render(
          <WelcomeMessage connectors={filledConnectors} knowledgeBase={emptyKnowledgeBase} />
        );

        fireEvent.click(getByTestId('observabilityAiAssistantWelcomeMessageInspectErrorsButton'));

        await waitForEuiPopoverOpen();

        const link = getByTestId('observabilityAiAssistantWelcomeMessageTrainedModelsLink');

        expect(link).toHaveProperty('href', 'http://app/ml/trained_models');
      });
    });
  });

  describe('when knowledge base is installing', () => {
    it('should not show a failure message', () => {
      const { queryByTestId } = render(
        <WelcomeMessage connectors={filledConnectors} knowledgeBase={installingKnowledgeBase} />
      );

      expect(
        queryByTestId('observabilityAiAssistantWelcomeMessageSetUpKnowledgeBaseButton')
      ).not.toBeInTheDocument();

      expect(
        queryByTestId('observabilityAiAssistantWelcomeMessageInspectErrorsButton')
      ).not.toBeInTheDocument();
    });

    it('should show a disclaimer', () => {
      const { getByTestId } = render(
        <WelcomeMessage connectors={emptyConnectors} knowledgeBase={emptyKnowledgeBase} />
      );

      expect(getByTestId('observabilityAiAssistantDisclaimer')).toBeInTheDocument();
    });
  });

  describe('when knowledge base is loading', () => {
    it('should not show a failure message', () => {
      const { queryByTestId } = render(
        <WelcomeMessage connectors={filledConnectors} knowledgeBase={loadingKnowledgeBase} />
      );

      expect(
        queryByTestId('observabilityAiAssistantWelcomeMessageSetUpKnowledgeBaseButton')
      ).not.toBeInTheDocument();

      expect(
        queryByTestId('observabilityAiAssistantWelcomeMessageInspectErrorsButton')
      ).not.toBeInTheDocument();
    });

    it('should show a disclaimer', () => {
      const { getByTestId } = render(
        <WelcomeMessage connectors={emptyConnectors} knowledgeBase={emptyKnowledgeBase} />
      );

      expect(getByTestId('observabilityAiAssistantDisclaimer')).toBeInTheDocument();
    });
  });

  describe('when knowledge base is installed', () => {
    it('should not show a failure message', () => {
      const { queryByTestId } = render(
        <WelcomeMessage connectors={filledConnectors} knowledgeBase={installedKnowledgeBase} />
      );

      expect(
        queryByTestId('observabilityAiAssistantWelcomeMessageSetUpKnowledgeBaseButton')
      ).not.toBeInTheDocument();

      expect(
        queryByTestId('observabilityAiAssistantWelcomeMessageInspectErrorsButton')
      ).not.toBeInTheDocument();
    });

    it('should show a disclaimer', () => {
      const { getByTestId } = render(
        <WelcomeMessage connectors={emptyConnectors} knowledgeBase={emptyKnowledgeBase} />
      );

      expect(getByTestId('observabilityAiAssistantDisclaimer')).toBeInTheDocument();
    });
  });
});
