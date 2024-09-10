/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncludeExcludeRow, IncludeExcludeRowProps } from './include_exclude_options';

const tableRows = [
  {
    '1': 'ABC',
    '2': 'test',
  },
  {
    '1': 'FEF',
    '2': 'test',
  },
];
const onUpdateSpy = jest.fn();

describe('IncludeExcludeComponent', () => {
  const renderIncludeExcludeRow = (propsOverrides?: Partial<IncludeExcludeRowProps>) => {
    const rtlRender = render(
      <IncludeExcludeRow
        include={[]}
        exclude={[]}
        updateParams={onUpdateSpy}
        columnId="1"
        isNumberField={false}
        includeIsRegex={false}
        excludeIsRegex={false}
        {...propsOverrides}
      />
    );
    return rtlRender;
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render 2 EuiComboBox component correctly', () => {
    renderIncludeExcludeRow();
    expect(screen.getAllByRole('combobox').length).toEqual(2);
  });

  it('should run updateParams function on update', async () => {
    renderIncludeExcludeRow({
      include: undefined,
      exclude: undefined,
      tableRows,
    });
    await userEvent.click(screen.getByRole('combobox', { name: 'Include values' }));
    fireEvent.click(screen.getByRole('option', { name: 'ABC' }));
    expect(screen.getByTestId('lens-include-terms-combobox')).toHaveTextContent('ABC');
    expect(onUpdateSpy).toHaveBeenCalledTimes(1);
  });

  it('should run updateParams function onCreateOption', async () => {
    renderIncludeExcludeRow({
      include: undefined,
      exclude: undefined,
      tableRows,
    });
    await userEvent.click(screen.getByRole('combobox', { name: 'Include values' }));
    await userEvent.type(screen.getByRole('combobox', { name: 'Include values' }), 'test.*{Enter}');
    expect(screen.getByTestId('lens-include-terms-combobox')).toHaveTextContent('test.*');
    expect(onUpdateSpy).toHaveBeenCalledTimes(1);
  });

  it('should initialize the selected options correctly if include prop is given', () => {
    renderIncludeExcludeRow({
      include: ['FEF'],
      exclude: undefined,
      tableRows,
    });
    expect(screen.getByTestId('lens-include-terms-combobox')).toHaveTextContent('FEF');
  });

  it('should initialize the selected options correctly if exclude prop is given', () => {
    renderIncludeExcludeRow({
      include: ['FEF'],
      exclude: ['ABC'],
      tableRows,
    });
    expect(screen.getByTestId('lens-include-terms-combobox')).toHaveTextContent('FEF');
    expect(screen.getByTestId('lens-exclude-terms-combobox')).toHaveTextContent('ABC');
  });

  it('should initialize the options correctly', async () => {
    renderIncludeExcludeRow({
      include: undefined,
      exclude: undefined,
      tableRows,
    });
    await userEvent.click(screen.getByRole('combobox', { name: 'Include values' }));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'ABC',
      'FEF',
    ]);
  });

  it('should display an input text if pattern is selected', () => {
    renderIncludeExcludeRow({
      include: ['test.*'],
      exclude: undefined,
      includeIsRegex: true,
      tableRows,
    });
    expect(
      screen.getByRole('textbox', { name: 'Enter a regex to filter values' })
    ).toBeInTheDocument();
  });

  it('should run updateParams on the input text if pattern is selected', async () => {
    renderIncludeExcludeRow({
      include: ['test.*'],
      exclude: undefined,
      includeIsRegex: false,
      tableRows,
    });
    await userEvent.click(screen.getByTestId('lens-include-terms-regex-switch'));
    expect(onUpdateSpy).toHaveBeenCalledWith('include', [], 'includeIsRegex', true);
  });

  it('should run as multi selection if normal string is given', async () => {
    renderIncludeExcludeRow({
      include: undefined,
      exclude: undefined,
      isNumberField: false,
      tableRows,
    });
    const typedValues = ['test.*', 'ABC'];
    await userEvent.click(screen.getByRole('combobox', { name: 'Include values' }));
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Include values' }),
      `${typedValues[0]}{Enter}`
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'Include values' }));
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Include values' }),
      `${typedValues[1]}{Enter}`
    );

    within(screen.getByTestId('lens-include-terms-combobox'))
      .getAllByTestId('euiComboBoxPill')
      .map((pill, i) => {
        expect(pill).toHaveTextContent(typedValues[i]);
      });
    expect(onUpdateSpy).toHaveBeenCalledTimes(2);
  });
});
