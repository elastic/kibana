/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { UpdatePrePackagedRulesCallOut } from './update_callout';
import { useKibana } from '../../../../common/lib/kibana';
jest.mock('../../../../common/lib/kibana');

describe('UpdatePrePackagedRulesCallOut', () => {
  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        docLinks: {
          ELASTIC_WEBSITE_URL: '',
          DOC_LINK_VERSION: '',
        },
      },
    });
  });
  it('renders correctly', () => {
    const wrapper = shallow(
      <UpdatePrePackagedRulesCallOut
        loading={false}
        numberOfUpdatedRules={0}
        updateRules={jest.fn()}
      />
    );

    expect(wrapper.find('EuiCallOut')).toHaveLength(1);
  });
});
