/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { FILE_FORMATS } from '../../../../../common/constants';

import { Overrides } from './overrides';

jest.mock('../../../../../../../../src/plugins/kibana_react/public', () => ({
  withKibana: (comp) => {
    return comp;
  },
}));

function getProps() {
  return {
    setOverrides: () => {},
    overrides: {},
    originalSettings: {},
    defaultSettings: {},
    setApplyOverrides: () => {},
    fields: [],
    kibana: {
      services: {
        docLinks: {
          links: {
            aggs: {
              date_format_pattern: 'jest-metadata-mock-url',
            },
          },
        },
      },
    },
  };
}

describe('Overrides', () => {
  test('render overrides', () => {
    const props = getProps();

    const component = shallowWithIntl(<Overrides {...props} />);

    expect(component).toMatchSnapshot();
  });

  test('render overrides and trigger a state change', () => {
    const FORMAT_1 = FILE_FORMATS.DELIMITED;
    const FORMAT_2 = FILE_FORMATS.NDJSON;

    const props = getProps();
    props.overrides.format = FORMAT_1;

    const component = mountWithIntl(<Overrides {...props} />);

    expect(component.state('overrides').format).toEqual(FORMAT_1);

    component.instance().onFormatChange([{ label: FORMAT_2 }]);

    expect(component.state('overrides').format).toEqual(FORMAT_2);
  });
});
