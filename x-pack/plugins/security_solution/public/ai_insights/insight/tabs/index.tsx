/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Replacements } from '@kbn/elastic-assistant-common';
import { EuiTabs, EuiTab } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { getTabs } from './get_tabs';
import type { AlertsInsight } from '../../types';

interface Props {
  insight: AlertsInsight;
  promptContextId: string | undefined;
  replacements?: Replacements;
  showAnonymized?: boolean;
}

const TabsComponent = (
  {
    insight,
    promptContextId,
    replacements,
    showAnonymized = false
  }: Props
) => {
  const tabs = useMemo(
    () => getTabs({ insight, promptContextId, replacements, showAnonymized }),
    [insight, promptContextId, replacements, showAnonymized]
  );

  const [selectedTabId, setSelectedTabId] = useState(tabs[0].id);

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId, tabs]);

  const onSelectedTabChanged = useCallback((id: string) => setSelectedTabId(id), []);

  return (
    <>
      <EuiTabs data-test-subj="tabs">
        {tabs.map((tab, index) => (
          <EuiTab
            key={index}
            isSelected={tab.id === selectedTabId}
            onClick={() => onSelectedTabChanged(tab.id)}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      {selectedTabContent}
    </>
  );
};

TabsComponent.displayName = 'Tabs';

export const Tabs = React.memo(TabsComponent);
