/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SloPopoverAndFlyout } from './slo_popover_flyout';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

const mockGetCreateSLOFormFlyout = jest.fn();

const mockGetRedirectUrl = jest.fn().mockReturnValue('/app/slos?search=test');

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      slo: {
        getCreateSLOFormFlyout: mockGetCreateSLOFormFlyout,
      },
      http: {
        basePath: {
          prepend: (path: string) => path,
        },
      },
      share: {
        url: {
          locators: {
            get: () => ({
              getRedirectUrl: mockGetRedirectUrl,
            }),
          },
        },
      },
    },
  }),
}));

jest.mock('../../../../hooks/use_apm_params', () => ({
  useApmParams: () => ({
    query: {
      environment: 'production',
    },
  }),
}));

function renderSloPopover(props: { canReadSlos: boolean; canWriteSlos: boolean }) {
  return render(
    <IntlProvider locale="en">
      <SloPopoverAndFlyout {...props} />
    </IntlProvider>
  );
}

describe('SloPopoverAndFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCreateSLOFormFlyout.mockReturnValue(
      <div data-test-subj="mockSloFlyout">SLO Flyout</div>
    );
  });

  describe('rendering', () => {
    it('renders SLOs header link', () => {
      renderSloPopover({ canReadSlos: true, canWriteSlos: true });

      expect(screen.getByTestId('apmSlosHeaderLink')).toBeInTheDocument();
      expect(screen.getByText('SLOs')).toBeInTheDocument();
    });

    it('renders with arrow down icon', () => {
      renderSloPopover({ canReadSlos: true, canWriteSlos: true });

      const headerLink = screen.getByTestId('apmSlosHeaderLink');
      expect(headerLink.querySelector('[data-euiicon-type="arrowDown"]')).toBeInTheDocument();
    });
  });

  describe('popover behavior', () => {
    it('opens popover when clicking header link', async () => {
      renderSloPopover({ canReadSlos: true, canWriteSlos: true });

      fireEvent.click(screen.getByTestId('apmSlosHeaderLink'));

      await waitFor(() => {
        expect(screen.getByTestId('apmSlosMenuItemCreateLatencySlo')).toBeInTheDocument();
      });
    });

    it('closes popover when clicking header link again', async () => {
      renderSloPopover({ canReadSlos: true, canWriteSlos: true });

      const headerLink = screen.getByTestId('apmSlosHeaderLink');
      fireEvent.click(headerLink);

      await waitFor(() => {
        expect(screen.getByTestId('apmSlosMenuItemCreateLatencySlo')).toBeInTheDocument();
      });

      fireEvent.click(headerLink);

      await waitFor(() => {
        expect(screen.queryByTestId('apmSlosMenuItemCreateLatencySlo')).not.toBeInTheDocument();
      });
    });
  });

  describe('menu items based on permissions', () => {
    it('shows create SLO options when user can write SLOs', async () => {
      renderSloPopover({ canReadSlos: false, canWriteSlos: true });

      fireEvent.click(screen.getByTestId('apmSlosHeaderLink'));

      await waitFor(() => {
        expect(screen.getByTestId('apmSlosMenuItemCreateLatencySlo')).toBeInTheDocument();
        expect(screen.getByTestId('apmSlosMenuItemCreateAvailabilitySlo')).toBeInTheDocument();
      });
    });

    it('hides create SLO options when user cannot write SLOs', async () => {
      renderSloPopover({ canReadSlos: true, canWriteSlos: false });

      fireEvent.click(screen.getByTestId('apmSlosHeaderLink'));

      await waitFor(() => {
        expect(screen.queryByTestId('apmSlosMenuItemCreateLatencySlo')).not.toBeInTheDocument();
        expect(
          screen.queryByTestId('apmSlosMenuItemCreateAvailabilitySlo')
        ).not.toBeInTheDocument();
      });
    });

    it('shows manage SLOs option when user can read SLOs', async () => {
      renderSloPopover({ canReadSlos: true, canWriteSlos: false });

      fireEvent.click(screen.getByTestId('apmSlosHeaderLink'));

      await waitFor(() => {
        expect(screen.getByTestId('apmSlosMenuItemManageSlos')).toBeInTheDocument();
      });
    });

    it('hides manage SLOs option when user cannot read SLOs', async () => {
      renderSloPopover({ canReadSlos: false, canWriteSlos: true });

      fireEvent.click(screen.getByTestId('apmSlosHeaderLink'));

      await waitFor(() => {
        expect(screen.queryByTestId('apmSlosMenuItemManageSlos')).not.toBeInTheDocument();
      });
    });

    it('shows all options when user has full permissions', async () => {
      renderSloPopover({ canReadSlos: true, canWriteSlos: true });

      fireEvent.click(screen.getByTestId('apmSlosHeaderLink'));

      await waitFor(() => {
        expect(screen.getByTestId('apmSlosMenuItemCreateLatencySlo')).toBeInTheDocument();
        expect(screen.getByTestId('apmSlosMenuItemCreateAvailabilitySlo')).toBeInTheDocument();
        expect(screen.getByTestId('apmSlosMenuItemManageSlos')).toBeInTheDocument();
      });
    });
  });

  describe('flyout behavior', () => {
    it('opens latency SLO flyout when clicking create latency SLO', async () => {
      renderSloPopover({ canReadSlos: true, canWriteSlos: true });

      fireEvent.click(screen.getByTestId('apmSlosHeaderLink'));

      await waitFor(() => {
        expect(screen.getByTestId('apmSlosMenuItemCreateLatencySlo')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('apmSlosMenuItemCreateLatencySlo'));

      await waitFor(() => {
        expect(mockGetCreateSLOFormFlyout).toHaveBeenCalledWith(
          expect.objectContaining({
            initialValues: {
              indicator: {
                type: 'sli.apm.transactionDuration',
                params: {
                  environment: 'production',
                },
              },
            },
            formSettings: {
              allowedIndicatorTypes: [
                'sli.apm.transactionDuration',
                'sli.apm.transactionErrorRate',
              ],
            },
          })
        );
      });
    });

    it('opens availability SLO flyout when clicking create availability SLO', async () => {
      renderSloPopover({ canReadSlos: true, canWriteSlos: true });

      fireEvent.click(screen.getByTestId('apmSlosHeaderLink'));

      await waitFor(() => {
        expect(screen.getByTestId('apmSlosMenuItemCreateAvailabilitySlo')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('apmSlosMenuItemCreateAvailabilitySlo'));

      await waitFor(() => {
        expect(mockGetCreateSLOFormFlyout).toHaveBeenCalledWith(
          expect.objectContaining({
            initialValues: {
              indicator: {
                type: 'sli.apm.transactionErrorRate',
                params: {
                  environment: 'production',
                },
              },
            },
            formSettings: {
              allowedIndicatorTypes: [
                'sli.apm.transactionDuration',
                'sli.apm.transactionErrorRate',
              ],
            },
          })
        );
      });
    });

    it('closes popover after clicking create SLO option', async () => {
      renderSloPopover({ canReadSlos: true, canWriteSlos: true });

      fireEvent.click(screen.getByTestId('apmSlosHeaderLink'));

      await waitFor(() => {
        expect(screen.getByTestId('apmSlosMenuItemCreateLatencySlo')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('apmSlosMenuItemCreateLatencySlo'));

      await waitFor(() => {
        expect(screen.queryByTestId('apmSlosMenuItemCreateLatencySlo')).not.toBeInTheDocument();
      });
    });
  });

  describe('manage SLOs link', () => {
    it('has correct href from SLO list locator', async () => {
      renderSloPopover({ canReadSlos: true, canWriteSlos: false });

      fireEvent.click(screen.getByTestId('apmSlosHeaderLink'));

      await waitFor(() => {
        const manageSlosLink = screen.getByTestId('apmSlosMenuItemManageSlos');
        expect(manageSlosLink).toHaveAttribute('href', '/app/slos?search=test');
        expect(mockGetRedirectUrl).toHaveBeenCalledWith({
          filters: [
            expect.objectContaining({
              meta: expect.objectContaining({
                key: 'slo.indicator.type',
                type: 'phrases',
              }),
            }),
          ],
        });
      });
    });
  });
});
