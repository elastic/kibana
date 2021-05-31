/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import HeaderMenuPortal from './header_menu_portal';

describe('HeaderMenuPortal', () => {
  describe('when unmounted', () => {
    it('calls setHeaderActionMenu with undefined', () => {
      const setHeaderActionMenu = jest.fn();

      const { unmount } = render(
        <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu}>test</HeaderMenuPortal>
      );

      unmount();

      expect(setHeaderActionMenu).toHaveBeenCalledWith(undefined);
    });
  });
});
