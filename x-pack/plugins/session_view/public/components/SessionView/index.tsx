/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { i18n } from '@kbn/i18n';
import {
  EuiSearchBar,
  EuiSearchBarOnChangeArgs,
  EuiEmptyPrompt,
  EuiButton,
  EuiSplitPanel,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { CoreStart } from '../../../../../../src/core/public';
import { ProcessTree } from '../ProcessTree';
import { Process, ProcessEvent } from '../../hooks/use_process_tree';
import { SessionViewDetailPanel } from '../SessionViewDetailPanel';
import { useStyles } from './styles';
import { PROCESS_EVENTS_ROUTE } from '../../../common/constants';

interface SessionViewDeps {
  // the root node of the process tree to render. e.g process.entry.entity_id or process.session.entity_id
  sessionEntityId: string;
  height?: number;
}

interface ProcessEventResults {
  events: {
    hits: any[];
    total: number;
  };
  alerts: {
    hits: any[];
    total: number;
  };
}

const BUTTON_OPEN_DETAIL_PANEL = i18n.translate(
  'xpack.sessionView.detailPanel.buttonOpenDetailPanel',
  {
    defaultMessage: 'Detail panel',
  }
);

/**
 * The main wrapper component for the session view.
 * TODO:
 * - Details panel
 * - Fullscreen toggle
 * - Search results navigation
 * - Settings menu (needs design)
 */
export const SessionView = ({ sessionEntityId, height }: SessionViewDeps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<ProcessEvent[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailMounted, setIsDetailMounted] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);

  const { http } = useKibana<CoreStart>().services;

  const styles = useStyles({ height });

  const onProcessSelected = (process: Process) => {
    if (selectedProcess !== process) {
      setSelectedProcess(process);
    }
  };

  const onSearch = ({ query }: EuiSearchBarOnChangeArgs) => {
    if (query) {
      setSearchQuery(query.text);
    } else {
      setSearchQuery('');
    }
  };

  const { data: getData } = useQuery<ProcessEventResults, Error>(
    ['process-tree', 'process_tree'],
    () =>
      http.get<ProcessEventResults>(PROCESS_EVENTS_ROUTE, {
        query: {
          sessionEntityId,
        },
      })
  );

  const sortEvents = (a: ProcessEvent, b: ProcessEvent) => {
    if (a['@timestamp'].valueOf() < b['@timestamp'].valueOf()) {
      return -1;
    } else if (a['@timestamp'].valueOf() > b['@timestamp'].valueOf()) {
      return 1;
    }

    return 0;
  };

  useEffect(() => {
    if (!getData) {
      return;
    }

    const events: ProcessEvent[] = (getData.events?.hits || []).map(
      (event: any) => event._source as ProcessEvent
    );
    const alerts: ProcessEvent[] = (getData.alerts?.hits || []).map((event: any) => {
      return event._source as ProcessEvent;
    });
    const all: ProcessEvent[] = events.concat(alerts).sort(sortEvents);
    setData(all);
  }, [getData]);

  const renderNoData = () => {
    return (
      <EuiEmptyPrompt
        title={<h2>No data to render</h2>}
        body={<p>No process events found for this query.</p>}
      />
    );
  };

  const toggleDetailPanel = () => {
    setIsDetailMounted(!isDetailMounted);
    if (!isDetailOpen) setIsDetailOpen(true);
  };

  if (!data.length) {
    return renderNoData();
  }

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiSearchBar query={searchQuery} onChange={onSearch} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={toggleDetailPanel} iconType="list" fill>
            {BUTTON_OPEN_DETAIL_PANEL}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSplitPanel.Outer
        direction="row"
        color="transparent"
        borderRadius="none"
        css={styles.outerPanel}
      >
        <EuiSplitPanel.Inner paddingSize="none" css={styles.treePanel}>
          {data && (
            <div css={styles.processTree}>
              <ProcessTree
                sessionEntityId={sessionEntityId}
                forward={data}
                searchQuery={searchQuery}
                selectedProcess={selectedProcess}
                onProcessSelected={onProcessSelected}
              />
            </div>
          )}
        </EuiSplitPanel.Inner>
        {isDetailOpen && (
          <SessionViewDetailPanel
            isDetailMounted={isDetailMounted}
            height={height}
            selectedProcess={selectedProcess}
            setIsDetailOpen={setIsDetailOpen}
            session={data?.[0]?.process.session}
          />
        )}
      </EuiSplitPanel.Outer>
    </>
  );
};
