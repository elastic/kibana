/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { useQuery } from 'react-query';
import { CoreStart } from 'kibana/public';

import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { SessionLeaderTable } from '../SessionLeaderTable';
import { SessionView } from '../SessionView';
import { ActionProps } from '../../../../timelines/common';
import { SESSION_ENTRY_LEADERS_ROUTE } from '../../../common/constants';

export interface SessionViewTableProcessTreeProps {
 // TODO: Not sure how we want to allow other plugins to modifiy this 
}

export const SessionViewTableProcessTree = (props: SessionViewTableProcessTreeProps) => {
  const [eventId, setEventId] = useState<string>('');
  const [selectedSessionEntityId, setSelectedSessionEntityId] = useState<string>('');

  const isFetchEnabled = !!(eventId && !selectedSessionEntityId);

  const { http } = useKibana<CoreStart>().services;
  const { data } = useQuery<any, Error>(
    [
      'SessionViewTableProcessTreeEvent', 
      eventId,
    ], 
    () => {
      return http.get<any>(SESSION_ENTRY_LEADERS_ROUTE, {
        query: {
          id: eventId,
        },
      });
    },
    {
      enabled: isFetchEnabled,
    },
  );

  const handleCloseProcessTree = () => {
    setEventId('');
    setSelectedSessionEntityId('');
  };

  useEffect(() => {
    if (data?.session_entry_leader?.process) {
      setSelectedSessionEntityId(data.session_entry_leader.process.entity_id);
    }
  }, [data]);
  
  const handleOpenSessionViewer = (props: ActionProps) => {
    setEventId(props.eventId);
  };

  if (selectedSessionEntityId) {
    return (
      <div>
        <EuiButtonEmpty 
          iconSide="left"
          iconType="cross"
          onClick={handleCloseProcessTree}
          data-test-subj="session-view-close-button"
        >
          Close session viewer
        </EuiButtonEmpty>
        <SessionView sessionEntityId={selectedSessionEntityId}/>
      </div>
    );
  }

  return (
    <SessionLeaderTable onOpenSessionViewer={handleOpenSessionViewer}/>
  );
};

SessionViewTableProcessTree.displayName = 'SessionViewTableProcessTree';
