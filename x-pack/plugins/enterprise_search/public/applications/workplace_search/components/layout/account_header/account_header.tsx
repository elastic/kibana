/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiHeader,
  EuiHeaderLogo,
  EuiHeaderLinks,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiText,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
} from '@elastic/eui';

import { getWorkplaceSearchUrl } from '../../../../shared/enterprise_search_url';
import { EuiButtonEmptyTo } from '../../../../shared/react_router_helpers';
import { AppLogic } from '../../../app_logic';
import { WORKPLACE_SEARCH_TITLE, ACCOUNT_NAV } from '../../../constants';
import { PERSONAL_SOURCES_PATH, LOGOUT_ROUTE, KIBANA_ACCOUNT_ROUTE } from '../../../routes';

export const AccountHeader: React.FC = () => {
  const [isPopoverOpen, setPopover] = useState(false);
  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };
  const closePopover = () => {
    setPopover(false);
  };

  const {
    account: { isAdmin },
  } = useValues(AppLogic);

  const accountNavItems = [
    <EuiContextMenuItem key="accountSettings">
      {/* TODO: Once auth is completed, we need to have non-admins redirect to the self-hosted form */}
      <EuiButtonEmpty href={KIBANA_ACCOUNT_ROUTE}>{ACCOUNT_NAV.SETTINGS}</EuiButtonEmpty>
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="logout">
      <EuiButtonEmpty href={LOGOUT_ROUTE}>{ACCOUNT_NAV.LOGOUT}</EuiButtonEmpty>
    </EuiContextMenuItem>,
  ];

  const accountButton = (
    <EuiButtonEmpty
      size="s"
      data-test-subj="AccountButton"
      iconType="arrowDown"
      iconSide="right"
      onClick={onButtonClick}
    >
      {ACCOUNT_NAV.ACCOUNT}
    </EuiButtonEmpty>
  );

  return (
    <EuiHeader>
      <EuiHeaderSection grow={false}>
        <EuiHeaderSectionItem>
          <EuiHeaderLogo iconType="logoWorkplaceSearch" />
          <EuiText>{WORKPLACE_SEARCH_TITLE}</EuiText>
        </EuiHeaderSectionItem>
        <EuiHeaderSectionItem>
          <EuiHeaderLinks>
            <EuiButtonEmptyTo to={PERSONAL_SOURCES_PATH}>{ACCOUNT_NAV.SOURCES}</EuiButtonEmptyTo>
          </EuiHeaderLinks>
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
      <EuiHeaderSection grow={false} side="right">
        <EuiHeaderLinks>
          {isAdmin && <EuiButtonEmptyTo to="/">{ACCOUNT_NAV.ORG_DASHBOARD}</EuiButtonEmptyTo>}
          <EuiPopover
            id="accountSubNav"
            button={accountButton}
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel size="s" items={accountNavItems} />
          </EuiPopover>
          <EuiButton href={getWorkplaceSearchUrl('/search')} target="_blank" iconType="search">
            {ACCOUNT_NAV.SEARCH}
          </EuiButton>
        </EuiHeaderLinks>
      </EuiHeaderSection>
    </EuiHeader>
  );
};
