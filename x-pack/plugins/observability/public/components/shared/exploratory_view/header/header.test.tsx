/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../rtl_helpers';
import { ExploratoryViewHeader } from './header';
import * as pluginHook from '../../../../hooks/use_plugin_context';

jest.spyOn(pluginHook, 'usePluginContext').mockReturnValue({
  appMountParameters: {
    setHeaderActionMenu: jest.fn(),
  },
} as any);

describe('ExploratoryViewHeader', function () {
  it('should render properly', function () {
    const { getByText } = render(
      <ExploratoryViewHeader
        seriesId={0}
        lensAttributes={{ title: 'Performance distribution' } as any}
      />
    );
    getByText('Refresh');
  });
});
