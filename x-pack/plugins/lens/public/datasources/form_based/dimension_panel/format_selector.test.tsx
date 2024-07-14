/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormatSelector, FormatSelectorProps } from './format_selector';
import { GenericIndexPatternColumn } from '../../..';
import { LensAppServices } from '../../../app_plugin/types';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock, docLinksServiceMock } from '@kbn/core/public/mocks';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const props = {
  onChange: jest.fn(),
  selectedColumn: {
    label: 'Max of bytes',
    dataType: 'number',
    isBucketed: false,

    // Private
    operationType: 'max',
    sourceField: 'bytes',
    params: { format: { id: 'bytes' } },
  } as GenericIndexPatternColumn,
  docLinks: docLinksServiceMock.createStartContract(),
};

function createMockServices(): LensAppServices {
  const services = coreMock.createStart();
  services.uiSettings.get.mockImplementation(() => '0.0');
  return {
    ...services,
    docLinks: {
      links: {
        indexPatterns: { fieldFormattersNumber: '' },
      },
    },
  } as unknown as LensAppServices;
}

const renderFormatSelector = (propsOverrides?: Partial<FormatSelectorProps>) => {
  const WrappingComponent: React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => {
    return (
      <I18nProvider>
        <KibanaContextProvider services={createMockServices()}>{children}</KibanaContextProvider>
      </I18nProvider>
    );
  };
  return render(<FormatSelector {...props} {...propsOverrides} />, {
    wrapper: WrappingComponent,
  });
};

describe('FormatSelector', () => {
  beforeEach(() => {
    (props.onChange as jest.Mock).mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });
  it('updates the format decimals', () => {
    renderFormatSelector();
    userEvent.type(screen.getByLabelText('Decimals'), '{backspace}10');
    expect(props.onChange).toBeCalledWith({ id: 'bytes', params: { decimals: 10 } });
  });
  it('updates the format decimals to upper range when input exceeds the range', () => {
    renderFormatSelector();
    userEvent.type(screen.getByLabelText('Decimals'), '{backspace}10');
    expect(props.onChange).toBeCalledWith({ id: 'bytes', params: { decimals: 15 } });
  });
  it('updates the format decimals to lower range when input is smaller than range', () => {
    renderFormatSelector();
    userEvent.type(screen.getByLabelText('Decimals'), '{backspace}-2');
    expect(props.onChange).toBeCalledWith({ id: 'bytes', params: { decimals: 0 } });
  });
  it('updates the suffix', () => {
    renderFormatSelector();
    userEvent.type(screen.getByTestId('indexPattern-dimension-formatSuffix'), 'GB');
    jest.advanceTimersByTime(256);
    expect(props.onChange).toBeCalledWith({ id: 'bytes', params: { suffix: 'GB' } });
  });

  describe('Duration', () => {
    it('hides the decimals and compact controls for humanize approximate output', () => {
      renderFormatSelector({
        selectedColumn: {
          ...props.selectedColumn,
          params: { format: { id: 'duration' } },
        },
      });
      expect(screen.queryByLabelText('Decimals')).toBeNull();
      expect(screen.queryByTestId('lns-indexpattern-dimension-formatCompact')).toBeNull();

      const durationEndInput = within(
        screen.getByTestId('indexPattern-dimension-duration-end')
      ).getByRole('combobox');
      userEvent.click(durationEndInput);
      fireEvent.click(screen.getByText('Hours'));
      jest.advanceTimersByTime(256);
      expect(props.onChange).toBeCalledWith({
        id: 'duration',
        params: { toUnit: 'asHours' },
      });

      expect(screen.queryByLabelText('Decimals')).toHaveValue(2);
      expect(screen.queryByTestId('lns-indexpattern-dimension-formatCompact')).toBeInTheDocument();
    });
  });
});
