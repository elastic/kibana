/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import HeaderMenuPortal from './header_menu_portal';
import { themeServiceMock } from '../../../../../../src/core/public/mocks';

describe('HeaderMenuPortal', () => {
  describe('when unmounted', () => {
    it('calls setHeaderActionMenu with undefined', () => {
      const setHeaderActionMenu = jest.fn();
      const theme$ = themeServiceMock.createTheme$();

      const { unmount } = render(
        <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
          test
        </HeaderMenuPortal>
      );

      unmount();

      expect(setHeaderActionMenu).toHaveBeenCalledWith(undefined);
    });
  });
});
