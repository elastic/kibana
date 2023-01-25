/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import * as redux from 'react-redux';
import { renderHook } from '@testing-library/react-hooks';

import {
  getDateFormat,
  useKibanaDateFormat,
  DEFAULT_FORMAT as DEFAULT_FORMAT_STRING,
} from './use_kibana_date_format';
import { WrappedHelper } from '../apps/synthetics/utils/testing';

const DEFAULT_SCALED_FORMAT = `[
  ["", "HH:mm:ss.SSS"],
  ["PT1S", "HH:mm:ss"],
  ["PT1M", "HH:mm"],
  ["PT1H", "YYYY-MM-DD HH:mm"],
  ["P1DT", "YYYY-MM-DD"],
  ["P1YT", "YYYY"],
  ["P2YT", "YYYY"]
]`;

const DEFAULT_FORMAT = {
  0: 'HH:mm:ss.SSS',
  1000: 'HH:mm:ss',
  60000: 'HH:mm',
  3600000: 'YYYY-MM-DD HH:mm',
  86400000: 'YYYY-MM-DD',
  31536000000: 'YYYY',
};

function defaultRenderHook(
  timestamp?: number,
  configOverride?: string,
  dateFormatOverride?: string
) {
  const get = jest.fn();
  get.mockImplementation((_key: string, def: string) => dateFormatOverride ?? def);
  return renderHook(() => useKibanaDateFormat(timestamp), {
    wrapper: ({ children }: { children: React.ReactElement }) => (
      <WrappedHelper
        core={{
          uiSettings: {
            getAll: jest.fn().mockReturnValue({
              'dateFormat:scaled': { value: configOverride ?? DEFAULT_SCALED_FORMAT },
            }),
            get,
          },
        }}
      >
        {children}
      </WrappedHelper>
    ),
  });
}

describe('useKibanaDateFormat', () => {
  describe('getDateFormat', () => {
    it.each`
      diff             | format
      ${'1'}           | ${'HH:mm:ss.SSS'}
      ${'1200'}        | ${'HH:mm:ss'}
      ${'65000'}       | ${'HH:mm'}
      ${'3900000'}     | ${'YYYY-MM-DD HH:mm'}
      ${'89400000'}    | ${'YYYY-MM-DD'}
      ${'32536000000'} | ${'YYYY'}
    `(`returns '$format' for '$diff'`, ({ diff, format }) => {
      expect(getDateFormat(DEFAULT_FORMAT, diff)).toBe(format);
    });
  });

  beforeEach(() => {
    jest.spyOn(moment, 'now').mockReturnValue(592437814);
    jest.spyOn(redux, 'useSelector').mockReturnValue({
      format: DEFAULT_FORMAT,
      formatString: DEFAULT_SCALED_FORMAT,
    });
  });

  afterAll(() => jest.clearAllMocks());

  it('returns expected format', () => {
    jest.spyOn(redux, 'useSelector').mockReturnValue({
      format: DEFAULT_FORMAT,
      formatString: undefined,
    });
    expect(defaultRenderHook(592435814).result.current).toBe(DEFAULT_FORMAT[1000]);
  });

  it('throws error for invalid format config', () => {
    expect(
      () =>
        defaultRenderHook(529304, '[["some invalid value"], ["an array", "with wrong length"]]')
          .result?.error
    ).toBeDefined();
  });

  it('returns default format for undefined timestamp', () => {
    expect(defaultRenderHook(undefined, undefined, undefined).result.current).toBe(
      DEFAULT_FORMAT_STRING
    );
  });
});
