/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { getEnginesDisplayText } from './get_engines_display_text';
import { IApiToken } from '../types';
import { ApiTokenTypes } from '../constants';

const apiToken: IApiToken = {
  name: '',
  type: ApiTokenTypes.Private,
  read: true,
  write: true,
  access_all_engines: true,
  engines: ['engine1', 'engine2', 'engine3'],
};

describe('getEnginesDisplayText', () => {
  it('returns "--" when the token is an admin token', () => {
    const wrapper = shallow(
      <div>{getEnginesDisplayText({ ...apiToken, type: ApiTokenTypes.Admin })}</div>
    );
    expect(wrapper.text()).toEqual('--');
  });

  it('returns "all" when access_all_engines is true', () => {
    const wrapper = shallow(
      <div>{getEnginesDisplayText({ ...apiToken, access_all_engines: true })}</div>
    );
    expect(wrapper.text()).toEqual('all');
  });

  it('returns a list of engines if access_all_engines is false', () => {
    const wrapper = shallow(
      <div>{getEnginesDisplayText({ ...apiToken, access_all_engines: false })}</div>
    );

    expect(wrapper.find('li').map((e) => e.text())).toEqual(['engine1', 'engine2', 'engine3']);
  });

  it('returns "--" when the token is an admin token, even if access_all_engines is true', () => {
    const wrapper = shallow(
      <div>
        {getEnginesDisplayText({
          ...apiToken,
          access_all_engines: true,
          type: ApiTokenTypes.Admin,
        })}
      </div>
    );
    expect(wrapper.text()).toEqual('--');
  });
});
