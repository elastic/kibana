/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeStories } from '@storybook/react';
import React from 'react';
import * as stories from './error_group_list.stories';
import { renderWithTheme } from '../../../../../utils/test_helpers';

const { Example } = composeStories(stories);

describe('ErrorGroupList', () => {
  it('renders', () => {
    expect(() => renderWithTheme(<Example />)).not.toThrowError();
  });
});
