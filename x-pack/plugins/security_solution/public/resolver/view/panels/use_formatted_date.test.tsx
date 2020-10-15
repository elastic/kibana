/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { useFormattedDate } from './use_formatted_date';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';
import { getUiSettings } from '../../mocks/get_ui_settings';

describe('useFormattedDate', () => {
  let element: HTMLElement;
  const testID = 'formattedDate';
  let reactRenderResult: (
    date: ConstructorParameters<typeof Date>[0] | Date | undefined
  ) => RenderResult;

  beforeEach(async () => {
    const mockCoreStart = coreMock.createStart();
    mockCoreStart.uiSettings.get.mockImplementation(getUiSettings);

    function Test({ date }: { date: ConstructorParameters<typeof Date>[0] | Date | undefined }) {
      const formattedDate = useFormattedDate(date);
      return <div data-test-subj={testID}>{formattedDate}</div>;
    }

    reactRenderResult = (
      date: ConstructorParameters<typeof Date>[0] | Date | undefined
    ): RenderResult =>
      render(
        <KibanaContextProvider services={mockCoreStart}>
          <Test date={date} />
        </KibanaContextProvider>
      );
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the provided date is undefined', () => {
    it('should return undefined', async () => {
      const { findByTestId } = reactRenderResult(undefined);
      element = await findByTestId(testID);

      expect(element).toBeEmptyDOMElement();
    });
  });

  describe('when the provided date is empty', () => {
    it('should return undefined', async () => {
      const { findByTestId } = reactRenderResult('');
      element = await findByTestId(testID);

      expect(element).toBeEmptyDOMElement();
    });
  });

  describe('when the provided date is an invalid date', () => {
    it('should return the string invalid date', async () => {
      const { findByTestId } = reactRenderResult('randomString');
      element = await findByTestId(testID);

      expect(element).toHaveTextContent('Invalid Date');
    });
  });

  describe('when the provided date is a stringified unix timestamp', () => {
    it('should return the string invalid date', async () => {
      const { findByTestId } = reactRenderResult('1600863932316');
      element = await findByTestId(testID);

      expect(element).toHaveTextContent('Invalid Date');
    });
  });

  describe('when the provided date is a valid numerical timestamp', () => {
    it('should return the string invalid date', async () => {
      const { findByTestId } = reactRenderResult(1600863932316);
      element = await findByTestId(testID);

      expect(element).toHaveTextContent('Sep 23, 2020 @ 08:25:32.316');
    });
  });

  describe('when the provided date is a date string', () => {
    it('should return the string invalid date', async () => {
      const { findByTestId } = reactRenderResult('2020-09-23T12:25:32Z');
      element = await findByTestId(testID);

      expect(element).toHaveTextContent('Sep 23, 2020 @ 08:25:32.000');
    });
  });

  describe('when the provided date is a valid date', () => {
    it('should return the string invalid date', async () => {
      const validDate = new Date(1600863932316);
      const { findByTestId } = reactRenderResult(validDate);
      element = await findByTestId(testID);

      expect(element).toHaveTextContent('Sep 23, 2020 @ 08:25:32.316');
    });
  });
});
