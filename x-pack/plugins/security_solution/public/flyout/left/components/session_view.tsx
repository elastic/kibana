/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { getField } from '../../shared/utils';
import { ERROR_MESSAGE, ERROR_TITLE } from '../../shared/translations';
import { SESSION_VIEW_ERROR_MESSAGE } from './translations';
import { SESSION_VIEW_ERROR_TEST_ID, SESSION_VIEW_TEST_ID } from './test_ids';
import { useKibana } from '../../../common/lib/kibana';
import { useLeftPanelContext } from '../context';
import { getSessionViewProcessIndex } from '../../../common/components/header_actions/helpers';

export const SESSION_VIEW_ID = 'session_view';
export const SESSION_ENTITY_ID = 'process.entry_leader.entity_id';
export const SESSION_START_TIME = 'process.entry_leader.start';
export const KIBANA_ANCESTOR_INDEX = 'kibana.alert.ancestors.index';

/**
 * Session view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const SessionView: FC = () => {
  const { sessionView } = useKibana().services;
  const { getFieldsData, indexName } = useLeftPanelContext();

  const processIndex = getSessionViewProcessIndex(
    getField(getFieldsData(KIBANA_ANCESTOR_INDEX)) || indexName
  );
  const sessionEntityId = getField(getFieldsData(SESSION_ENTITY_ID));
  const sessionStartTime = getField(getFieldsData(SESSION_START_TIME));

  if (!processIndex || !sessionEntityId || !sessionStartTime) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>{ERROR_TITLE(SESSION_VIEW_ERROR_MESSAGE)}</h2>}
        body={<p>{ERROR_MESSAGE(SESSION_VIEW_ERROR_MESSAGE)}</p>}
        data-test-subj={SESSION_VIEW_ERROR_TEST_ID}
      />
    );
  }

  return (
    <div data-test-subj={SESSION_VIEW_TEST_ID}>
      {sessionView.getSessionView({
        processIndex,
        sessionEntityId,
        sessionStartTime,
        isFullScreen: true,
      })}
    </div>
  );
};

SessionView.displayName = 'SessionView';
