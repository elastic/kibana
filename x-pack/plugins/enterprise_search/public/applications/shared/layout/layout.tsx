/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import classNames from 'classnames';

import { EuiPage, EuiPageSideBar, EuiPageBody, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import './layout.scss';

interface ILayoutProps {
  navigation: React.ReactNode;
}

export interface INavContext {
  closeNavigation(): void;
}
export const NavContext = React.createContext({});

export const Layout: React.FC<ILayoutProps> = ({ children, navigation }) => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const toggleNavigation = () => setIsNavOpen(!isNavOpen);
  const closeNavigation = () => setIsNavOpen(false);

  const navClasses = classNames('enterpriseSearchLayout__sideBar', {
    'enterpriseSearchLayout__sideBar--isOpen': isNavOpen, // eslint-disable-line @typescript-eslint/naming-convention
  });

  return (
    <EuiPage className="enterpriseSearchLayout">
      <EuiPageSideBar className={navClasses}>
        <div className="enterpriseSearchLayout__sideBarToggle">
          <EuiButton
            size="s"
            iconType={isNavOpen ? 'arrowDown' : 'arrowRight'}
            iconSide="right"
            aria-label={i18n.translate('xpack.enterpriseSearch.nav.toggleMenu', {
              defaultMessage: 'Toggle secondary navigation',
            })}
            aria-expanded={isNavOpen}
            aria-pressed={isNavOpen}
            aria-controls="enterpriseSearchNav"
            onClick={toggleNavigation}
            data-test-subj="enterpriseSearchNavToggle"
          >
            {i18n.translate('xpack.enterpriseSearch.nav.menu', {
              defaultMessage: 'Menu',
            })}
          </EuiButton>
        </div>
        <NavContext.Provider value={{ closeNavigation }}>{navigation}</NavContext.Provider>
      </EuiPageSideBar>
      <EuiPageBody className="enterpriseSearchLayout__body">{children}</EuiPageBody>
    </EuiPage>
  );
};
