/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTab, EuiTabs, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useLazyRef } from '../hooks/use_lazy_ref';
import { MobileErrorTabIds, useTabId } from '../hooks/use_tab_id';
import { MobileErrorGroupOverview } from '../error_groups';
import { MobileCrashGroupOverview } from '../crash_groups';

const tabs = [
  {
    id: MobileErrorTabIds.ERRORS,
    name: i18n.translate('xpack.apm.serviceDetails.metrics.errorsList.title', {
      defaultMessage: 'Errors',
    }),
    'data-test-subj': 'apmMobileErrorsTabButton',
  },
  {
    id: MobileErrorTabIds.CRASHES,
    name: i18n.translate('xpack.apm.mobile.location.metrics.crashes', {
      defaultMessage: 'Crashes',
    }),
    append: <div />,
    'data-test-subj': 'apmMobileCrashesTabButton',
  },
];

export function Tabs({
  mobileErrorTabId,
}: {
  mobileErrorTabId: MobileErrorTabIds;
}) {
  const [selectedTabId, setSelectedTabId] = useTabId(mobileErrorTabId);
  const tabEntries = tabs.map((tab, index) => (
    <EuiTab
      {...tab}
      key={tab.id}
      onClick={() => {
        setSelectedTabId(tab.id);
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
      {selectedTabId === MobileErrorTabIds.ERRORS && (
        <MobileErrorGroupOverview />
      )}
      {selectedTabId === MobileErrorTabIds.CRASHES && (
        <MobileCrashGroupOverview />
      )}
    </>
  );
}
  mobileErrorTabId,
}: {
  mobileErrorTabId: MobileErrorTabIds;
}) {
  const [selectedTabId, setSelectedTabId] = useTabId(mobileErrorTabId);
  const renderedTabsSet = useLazyRef(() => new Set([selectedTabId]));
  const tabEntries = tabs.map((tab, index) => (
    <EuiTab
      {...tab}
      key={tab.id}
      onClick={() => {
        renderedTabsSet.current.add(tab.id); // On a tab click, mark the tab content as allowed to be rendered
        setSelectedTabId(tab.id);
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
      {renderedTabsSet.current.has(MobileErrorTabIds.ERRORS) && (
        <div hidden={selectedTabId !== MobileErrorTabIds.ERRORS}>
          <MobileErrorGroupOverview />
        </div>
      )}
      {renderedTabsSet.current.has(MobileErrorTabIds.CRASHES) && (
        <div hidden={selectedTabId !== MobileErrorTabIds.CRASHES}>
          <MobileCrashGroupOverview />
        </div>
      )}
    </>
  );
}
