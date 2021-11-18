/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect, ReactNode } from 'react';
import MonacoEditor from 'react-monaco-editor';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiSplitPanel, EuiTitle, EuiTabs, EuiTab } from '@elastic/eui';
import { Process } from '../../hooks/use_process_tree';
import { useStyles } from './styles';

interface SessionViewDetailPanelDeps {
  isDetailMounted: boolean;
  height?: number;
  selectedProcess: Process | null;
  setIsDetailOpen(isDetailOpen: boolean): void;
  session?: any;
}

interface ProcessEventTabData {
  id: string | number;
  name: string;
  content: ReactNode;
}

const DETAIL_PANEL_COMMAND = i18n.translate('xpack.sessionView.detailPanel.detailPanelCommand', {
  defaultMessage: 'Command detail',
});

const DETAIL_PANEL_SESSION = i18n.translate('xpack.sessionView.detailPanel.detailPanelSession', {
  defaultMessage: 'Session detail',
});

const DETAIL_PANEL_SERVER = i18n.translate('xpack.sessionView.detailPanel.detailPanelServer', {
  defaultMessage: 'Server detail',
});

const DETAIL_PANEL_ALERT = i18n.translate('xpack.sessionView.detailPanel.detailPanelAlert', {
  defaultMessage: 'Alert detail',
});

/**
 * Detail panel in the session view.
 */
export const SessionViewDetailPanel = ({
  isDetailMounted,
  height,
  selectedProcess,
  setIsDetailOpen,
  session,
}: SessionViewDetailPanelDeps) => {
  const [selectedDetailTab, setSelectedDetailTab] = useState<string | number>('');
  const [processEventsTabs, setProcessEventsTabs] = useState<ProcessEventTabData[]>([]);

  const styles = useStyles({ height });

  useEffect(() => {
    const selectedProcessEvents = (selectedProcess?.events || []).map((processEvent, idx) => ({
      id: `${processEvent?.event.action}-${idx + 1}` || `event-${idx + 1}`,
      name: `${processEvent?.event.action}-${idx + 1}` || `event-${idx + 1}`,
      content: (
        <div>
          <MonacoEditor
            height={400}
            language="json"
            options={{
              lineNumbers: 'on',
              readOnly: true,
            }}
            value={JSON.stringify(processEvent || {}, null, 4)}
          />
          <EuiSpacer size="xxl" />
        </div>
      ),
    }));

    setProcessEventsTabs(selectedProcessEvents);
    setSelectedDetailTab(selectedProcessEvents?.[0].id || '');
  }, [selectedProcess]);

  const handleAnimationEnd = () => {
    if (!isDetailMounted) {
      setIsDetailOpen(false);
    }
  };

  const renderSelectedProcessEvents = () => {
    if (selectedProcess) {
      return (
        <div>
          <EuiTitle size="s">
            <span>{DETAIL_PANEL_COMMAND}</span>
          </EuiTitle>
          <EuiSpacer />
          <EuiTabs>
            {processEventsTabs.map((tab, idx) => (
              <EuiTab
                key={idx}
                onClick={() => setSelectedDetailTab(tab.id)}
                isSelected={tab.id === selectedDetailTab}
              >
                {tab.name}
              </EuiTab>
            ))}
          </EuiTabs>
          <EuiSpacer size="xxl" />
          {processEventsTabs.find((tab) => tab.id === selectedDetailTab)?.content}
        </div>
      );
    }
  };

  return (
    <EuiSplitPanel.Inner
      paddingSize="s"
      color="plain"
      css={isDetailMounted ? styles.detailPanelIn : styles.detailPanelOut}
      onAnimationEnd={handleAnimationEnd}
    >
      {renderSelectedProcessEvents()}
      <EuiTitle size="s">
        <span>{DETAIL_PANEL_SESSION}</span>
      </EuiTitle>
      <EuiSpacer />
      <MonacoEditor
        height={400}
        language="json"
        options={{
          lineNumbers: 'on',
          readOnly: true,
        }}
        value={JSON.stringify(session || {}, null, 4)}
      />
      <EuiSpacer size="xxl" />
      <EuiTitle size="s">
        <span>{DETAIL_PANEL_SERVER}</span>
      </EuiTitle>
      {/* Add server detail */}
      <EuiSpacer size="xxl" />
      <EuiTitle size="s">
        <span>{DETAIL_PANEL_ALERT}</span>
      </EuiTitle>
      {/* Add alert detail conditionally */}
    </EuiSplitPanel.Inner>
  );
};
