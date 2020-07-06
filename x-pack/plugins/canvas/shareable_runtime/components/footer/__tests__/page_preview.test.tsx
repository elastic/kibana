/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { JestContext } from '../../../test/context_jest';
import { PagePreview } from '../page_preview';
import { getRenderedElement as element } from '../../../test/selectors';

jest.mock('../../../supported_renderers');

describe('<PagePreview />', () => {
  test('null workpad renders nothing', () => {
    expect(mount(<PagePreview height={100} index={0} />).isEmptyRender());
  });

  const wrapper = mount(
    <JestContext>
      <PagePreview height={100} index={0} />
    </JestContext>
  );

  test('renders as expected', () => {
    expect(element(wrapper).text()).toEqual('markdown mock');
  });
});
