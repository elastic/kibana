/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPage, EuiPageSideBar, EuiPageBody, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import './private_sources_layout.scss';

interface LayoutProps {
  restrictWidth?: boolean;
  readOnlyMode?: boolean;
}

export const PrivateSourcesLayout: React.FC<LayoutProps> = ({
  children,
  restrictWidth,
  readOnlyMode,
}) => {
  return (
    <EuiPage className="enterpriseSearchLayout">
      <EuiPageSideBar className={'enterpriseSearchLayout__sideBar'} />
      <EuiPageBody className="enterpriseSearchLayout__body" restrictWidth={restrictWidth}>
        {readOnlyMode && (
          <EuiCallOut
            className="enterpriseSearchLayout__readOnlyMode"
            color="warning"
            iconType="lock"
            title={i18n.translate('xpack.enterpriseSearch.readOnlyMode.warning', {
              defaultMessage:
                'Enterprise Search is in read-only mode. You will be unable to make changes such as creating, editing, or deleting.',
            })}
          />
        )}
        {children}
      </EuiPageBody>
    </EuiPage>
  );
};
