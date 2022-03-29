/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../../../kibana_services', () => {
  return {
    getIsDarkMode() {
      return false;
    },
  };
});

jest.mock('../../symbol_utils', () => {
  return {
    SYMBOL_OPTIONS: [
      {
        value: 'symbol1',
        label: 'symbol1',
        svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="square-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path d="M13,14H2c-0.5523,0-1-0.4477-1-1V2c0-0.5523,0.4477-1,1-1h11c0.5523,0,1,0.4477,1,1v11C14,13.5523,13.5523,14,13,14z"/>\n</svg>',
      },
      {
        value: 'symbol2',
        label: 'symbol2',
        svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="triangle-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path id="path21090-9" d="M7.5385,2&#xA;&#x9;C7.2437,2,7.0502,2.1772,6.9231,2.3846l-5.8462,9.5385C1,12,1,12.1538,1,12.3077C1,12.8462,1.3846,13,1.6923,13h11.6154&#xA;&#x9;C13.6923,13,14,12.8462,14,12.3077c0-0.1538,0-0.2308-0.0769-0.3846L8.1538,2.3846C8.028,2.1765,7.7882,2,7.5385,2z"/>\n</svg>',
      },
    ],
  };
});

import React from 'react';
import { shallow } from 'enzyme';

import { IconSelect } from './icon_select';

test('Should render icon select', () => {
  const component = shallow(
    <IconSelect customIcons={{}} icon={{ value: 'symbol1' }} onChange={() => {}} />
  );

  expect(component).toMatchSnapshot();
});

test('Should render icon select with custom icons', () => {
  const component = shallow(
    <IconSelect
      customIcons={{
        __kbn__custom_icon_sdf__foobar: {
          symbolId: '__kbn__custom_icon_sdf__foobar',
          label: 'My Custom Icon',
          svg: '<svg width="200" height="250" xmlns="http://www.w3.org/2000/svg"><path stroke="#000" fill="transparent" stroke-width="5" d="M10 10h30v30H10z"/></svg>',
          cutoff: 0.25,
          radius: 0.25,
        },
        __kbn__custom_icon_sdf__bizzbuzz: {
          symbolId: '__kbn__custom_icon_sdf__bizzbuzz',
          label: 'My Other Custom Icon',
          svg: '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="531.74" height="460.5" overflow="visible" xml:space="preserve"><path stroke="#000" d="M.866 460 265.87 1l265.004 459z"/></svg>',
          cutoff: 0.3,
          radius: 0.15,
        },
      }}
      icon={{
        value: '__kbn__custom_icon_sdf__foobar',
        svg: '<svg width="200" height="250" xmlns="http://www.w3.org/2000/svg"><path stroke="#000" fill="transparent" stroke-width="5" d="M10 10h30v30H10z"/></svg>',
        label: 'My Custom Icon',
      }}
    />
  );

  expect(component).toMatchSnapshot();
});
