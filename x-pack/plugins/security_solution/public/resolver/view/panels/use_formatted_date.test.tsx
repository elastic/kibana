/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';

import React from 'react';
import { useFormattedDate } from './use_formatted_date';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { uiSetting } from '../../mocks/ui_setting';

describe(`useFormattedDate, when the "dateFormat" UI setting is "${uiSetting(
  'dateFormat'
)}" and the "dateFormat:tz" setting is "${uiSetting('dateFormat:tz')}"`, () => {
  let formattedDate: (date: ConstructorParameters<typeof Date>[0] | Date | undefined) => string;

  beforeEach(async () => {
    const mockCoreStart = coreMock.createStart();
    mockCoreStart.uiSettings.get.mockImplementation(uiSetting);

    function Test({ date }: { date: ConstructorParameters<typeof Date>[0] | Date | undefined }) {
      return <>{useFormattedDate(date)}</>;
    }

    formattedDate = (date: ConstructorParameters<typeof Date>[0] | Date | undefined): string =>
      mount(
        <KibanaContextProvider services={mockCoreStart}>
          <Test date={date} />
        </KibanaContextProvider>
      ).text();
  });

  it.each([
    ['randomString', 'an invalid string', 'Invalid Date'],
    [
      '1600863932316',
      "a string that does't match the configured time format settings",
      'Invalid Date',
    ],
    [1600863932316, 'a valid unix timestamp', 'Sep 23, 2020 @ 08:25:32.316'],
    [undefined, 'undefined', ''],
    ['', 'an empty string', ''],
    [
      '2020-09-23T12:25:32Z',
      'a string that conforms to the specified format',
      'Sep 23, 2020 @ 08:25:32.000',
    ],
    [new Date(1600863932316), 'a defined Date object', 'Sep 23, 2020 @ 08:25:32.316'],
  ])('when the provided date is %p (%s) it should return %p', (value, _explanation, expected) => {
    expect(formattedDate(value)).toBe(expected);
  });
});
