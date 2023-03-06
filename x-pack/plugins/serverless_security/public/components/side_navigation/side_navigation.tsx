/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { i18n } from '@kbn/i18n';
import { SolutionNav } from '@kbn/shared-ux-page-solution-nav';
import {
  EuiButtonIcon,
  EuiCollapsibleNav,
  EuiLoadingSpinner,
  EuiThemeProvider,
  useEuiTheme,
} from '@elastic/eui';
import { SideNavigation } from '@kbn/shared-ux-side-navigation';
import { useSideNavItems, useSideNavSelectedId } from '../../hooks/use_side_nav_items';

const LOCAL_STORAGE_IS_OPEN_KEY = 'SECURITY_SERVERLESS_SIDE_NAVIGATION_OPEN' as const;

const translatedNavTitle = i18n.translate('xpack.securityServerless.navigation.mainLabel', {
  defaultMessage: 'Security',
});

export const SecuritySideNavigation: React.FC = () => {
  const [items, footerItems] = useSideNavItems();
  const selectedId = useSideNavSelectedId();
  const { euiTheme, colorMode } = useEuiTheme();

  const [isOpen, setIsOpen] = useLocalStorage(LOCAL_STORAGE_IS_OPEN_KEY, true);

  const toggleOpen = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen, setIsOpen]);

  const isLoading = items.length === 0 && footerItems.length === 0;

  return (
    <EuiThemeProvider colorMode={colorMode === 'DARK' ? 'LIGHT' : 'DARK'}>
      <EuiCollapsibleNav
        css={{
          borderInlineEndWidth: 1,
          background: euiTheme.colors.darkestShade,
          display: 'flex',
          flexDirection: 'row',
        }}
        isOpen={true}
        showButtonIfDocked={true}
        onClose={toggleOpen}
        isDocked={true}
        size={isOpen ? 248 : 40}
        hideCloseButton={false}
        button={
          <span css={{ marginLeft: -32, marginTop: 27, position: 'fixed', zIndex: 1000 }}>
            <EuiButtonIcon
              iconType={isOpen ? 'menuLeft' : 'menuRight'}
              aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
              color="text"
              onClick={toggleOpen}
            />
          </span>
        }
      >
        {isOpen &&
          (isLoading ? (
            <EuiLoadingSpinner size="m" data-test-subj="sideNavLoader" />
          ) : (
            <SolutionNav
              canBeCollapsed={false}
              name={translatedNavTitle}
              icon={'logoSecurity'}
              children={
                <SideNavigation
                  items={items}
                  footerItems={footerItems}
                  selectedId={selectedId}
                  panelBottomOffset={undefined}
                />
              }
              closeFlyoutButtonPosition={'inside'}
            />
          ))}
      </EuiCollapsibleNav>
    </EuiThemeProvider>
  );
};
