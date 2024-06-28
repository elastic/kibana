/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import {
  ANCESTOR_INDEX,
  ENTRY_LEADER_ENTITY_ID,
  ENTRY_LEADER_START,
} from '../../shared/constants/field_names';
import { getField } from '../../shared/utils';
import { SESSION_VIEW_TEST_ID } from './test_ids';
import { useKibana } from '../../../../common/lib/kibana';
import { useDocumentDetailsContext } from '../../shared/context';

export const SESSION_VIEW_ID = 'session-view';

/**
 * Session view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const SessionView: FC = () => {
  const { sessionView } = useKibana().services;
  const { getFieldsData, indexName } = useDocumentDetailsContext();

  const ancestorIndex = getField(getFieldsData(ANCESTOR_INDEX)); // e.g in case of alert, we want to grab it's origin index
  const sessionEntityId = getField(getFieldsData(ENTRY_LEADER_ENTITY_ID)) || '';
  const sessionStartTime = getField(getFieldsData(ENTRY_LEADER_START)) || '';
  const index = ancestorIndex || indexName;

  // TODO as part of https://github.com/elastic/security-team/issues/7031
  //  bring back no data message if needed

  return (
    <div data-test-subj={SESSION_VIEW_TEST_ID}>
      {sessionView.getSessionView({
        index,
        sessionEntityId,
        sessionStartTime,
        isFullScreen: true,
      })}
    </div>
  );
};

SessionView.displayName = 'SessionView';
