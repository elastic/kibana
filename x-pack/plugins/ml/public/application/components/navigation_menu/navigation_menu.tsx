/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { isFullLicense } from '../../license';

import { MainTabs } from './main_tabs';

export type TabId =
  | 'access-denied'
  | 'anomaly_detection'
  | 'data_frame_analytics'
  | 'datavisualizer'
  | 'overview'
  | 'settings';

interface Props {
  tabId: TabId;
}

export const NavigationMenu: FC<Props> = ({ tabId }) => {
  const disableLinks = isFullLicense() === false;

  return (
    <Fragment>
      <EuiFlexGroup justifyContent="spaceBetween" className="mlNavigationMenu" gutterSize="none">
        <EuiFlexItem grow={false}>
          <MainTabs tabId={tabId} disableLinks={disableLinks} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};
