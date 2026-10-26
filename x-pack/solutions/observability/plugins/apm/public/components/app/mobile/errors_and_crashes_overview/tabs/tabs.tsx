/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTab, EuiTabs, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MobileErrorsOverview } from '../errors_overview';
import { MobileCrashesOverview } from '../crashes_overview';

export enum MobileErrorTabIds {
  ERRORS = 'errors',
  CRASHES = 'crashes',
}

const tabs = [
  {
    id: MobileErrorTabIds.ERRORS,
    name: i18n.translate('xpack.apm.mobile.errorsAndCrashes.errorsTab', {
      defaultMessage: 'Errors',
    }),
    'data-test-subj': 'apmMobileErrorsTabButton',
  },
  {
    id: MobileErrorTabIds.CRASHES,
    name: i18n.translate('xpack.apm.mobile.errorsAndCrashes.crashesTab', {
      defaultMessage: 'Crashes',
    }),
    append: <div />,
    'data-test-subj': 'apmMobileCrashesTabButton',
  },
];

export function Tabs({
  mobileErrorTabId,
  onTabClick,
}: {
  mobileErrorTabId: MobileErrorTabIds;
  onTabClick: (nextTab: MobileErrorTabIds) => void;
}) {
  const selectedTabId = mobileErrorTabId;
  const tabEntries = tabs.map((tab, index) => (
    <EuiTab
      {...tab}
      key={tab.id}
      onClick={() => {
        onTabClick(tab.id);
      }}
      isSelected={tab.id === selectedTabId}
      append={tab.append}
    >
      {tab.name}
    </EuiTab>
  ));

  return (
    <>
      <EuiTabs>{tabEntries}</EuiTabs>
      <EuiSpacer />
      {selectedTabId === MobileErrorTabIds.ERRORS && <MobileErrorsOverview />}
      {selectedTabId === MobileErrorTabIds.CRASHES && <MobileCrashesOverview />}
    </>
  );
}
