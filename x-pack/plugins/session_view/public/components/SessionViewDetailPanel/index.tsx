/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect, ReactNode } from 'react';
import MonacoEditor from 'react-monaco-editor';
import { partition } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiSplitPanel, EuiTitle, EuiTabs, EuiTab } from '@elastic/eui';
import { EventKind, Process } from '../../../common/types/process_tree';
import { useStyles } from './styles';

interface SessionViewDetailPanelDeps {
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

  const renderSelectedProcessCommandDetail = () => {
    if (selectedProcess) {
      return (
        <div data-test-subj="sessionViewDetailPanelCommandDetail">
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
        <div data-test-subj="sessionViewDetailPanelAlertDetail">
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
    <>
      {renderSelectedProcessCommandDetail()}
      <div data-test-subj="sessionViewDetailPanelSessionDetail">
        <EuiTitle size="s">
          <span>
            <FormattedMessage
              id="xpack.sessionView.sessionDetail"
              defaultMessage="Session detail"
            />
          </span>
        </EuiTitle>
        {/* Add session detail */}
      </div>
      <EuiSpacer size="xxl" />
      <div data-test-subj="sessionViewDetailPanelServerDetail">
        <EuiTitle size="s">
          <span>
            <FormattedMessage id="xpack.sessionView.serverDetail" defaultMessage="Server detail" />
          </span>
        </EuiTitle>
        {/* Add server detail */}
      </div>
      <EuiSpacer size="xxl" />
      {renderSelectedProcessAlertDetail()}
    </>
  );
};
