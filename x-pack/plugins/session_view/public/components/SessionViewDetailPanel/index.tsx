/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect, ReactNode } from 'react';
import MonacoEditor from 'react-monaco-editor';
import { partition } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiSplitPanel, EuiTitle, EuiTabs, EuiTab } from '@elastic/eui';
import { EventKind, Process } from '../../hooks/use_process_tree';
import { useStyles } from './styles';

interface SessionViewDetailPanelDeps {
  isDetailMounted: boolean;
  height?: number;
  selectedProcess: Process | null;
  setIsDetailOpen(isDetailOpen: boolean): void;
  session?: any;
}

interface ProcessDetailTabData {
  id: string | number;
  name: string;
  content: ReactNode;
  kind: string;
}

/**
 * Detail panel in the session view.
 */
export const SessionViewDetailPanel = ({
  isDetailMounted,
  height,
  selectedProcess,
  setIsDetailOpen,
}: SessionViewDetailPanelDeps) => {
  const [selectedCommandTab, setSelectedCommandTab] = useState<string | number>('');
  const [commandTabs, setCommandTabs] = useState<ProcessDetailTabData[]>([]);
  const [selectedAlertTab, setSelectedAlertTab] = useState<string | number>('');
  const [alertTabs, setAlertTabs] = useState<ProcessDetailTabData[]>([]);

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
      kind: processEvent?.event.kind,
    }));

    const [processCommandTabs, processAlertTabs] = partition(selectedProcessEvents, {
      kind: EventKind.event,
    });

    setCommandTabs(processCommandTabs);
    setSelectedCommandTab(processCommandTabs[0]?.id || '');
    setAlertTabs(processAlertTabs);
    setSelectedAlertTab(processAlertTabs[0]?.id || '');
  }, [selectedProcess]);

  const handleAnimationEnd = () => {
    if (!isDetailMounted) {
      setIsDetailOpen(false);
    }
  };

  const renderSelectedProcessCommandDetail = () => {
    if (selectedProcess) {
      return (
        <div>
          <EuiTitle size="s">
            <span>
              <FormattedMessage
                id="xpack.sessionView.commandDetail"
                defaultMessage="Command detail"
              />
            </span>
          </EuiTitle>
          <EuiSpacer />
          <EuiTabs>
            {commandTabs.map((tab, idx) => (
              <EuiTab
                key={idx}
                onClick={() => setSelectedCommandTab(tab.id)}
                isSelected={tab.id === selectedCommandTab}
              >
                {tab.name}
              </EuiTab>
            ))}
          </EuiTabs>
          <EuiSpacer size="xxl" />
          {commandTabs.find((tab) => tab.id === selectedCommandTab)?.content}
        </div>
      );
    }
  };

  const renderSelectedProcessAlertDetail = () => {
    if (selectedProcess && selectedProcess.hasAlerts()) {
      return (
        <div>
          <EuiTitle size="s">
            <span>
              <FormattedMessage id="xpack.sessionView.alertDetail" defaultMessage="Alert detail" />
            </span>
          </EuiTitle>
          <EuiSpacer />
          <EuiTabs>
            {alertTabs.map((tab, idx) => (
              <EuiTab
                key={idx}
                onClick={() => setSelectedAlertTab(tab.id)}
                isSelected={tab.id === selectedAlertTab}
              >
                {tab.name}
              </EuiTab>
            ))}
          </EuiTabs>
          <EuiSpacer size="xxl" />
          {alertTabs.find((tab) => tab.id === selectedAlertTab)?.content}
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
      {renderSelectedProcessCommandDetail()}
      <EuiTitle size="s">
        <span>
          <FormattedMessage id="xpack.sessionView.sessionDetail" defaultMessage="Session detail" />
        </span>
      </EuiTitle>
      {/* Add session detail */}
      <EuiSpacer size="xxl" />
      <EuiTitle size="s">
        <span>
          <FormattedMessage id="xpack.sessionView.serverDetail" defaultMessage="Server detail" />
        </span>
      </EuiTitle>
      {/* Add server detail */}
      <EuiSpacer size="xxl" />
      {renderSelectedProcessAlertDetail()}
    </EuiSplitPanel.Inner>
  );
};
