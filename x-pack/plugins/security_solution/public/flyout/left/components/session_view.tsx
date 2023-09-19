/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ANCESTOR_INDEX,
  ENTRY_LEADER_ENTITY_ID,
  ENTRY_LEADER_START,
} from '../../shared/constants/field_names';
import { getField } from '../../shared/utils';
import { SESSION_VIEW_ERROR_TEST_ID, SESSION_VIEW_TEST_ID } from './test_ids';
import { useKibana } from '../../../common/lib/kibana';
import { useLeftPanelContext } from '../context';

export const SESSION_VIEW_ID = 'session-view';

/**
 * Session view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const SessionView: FC = () => {
  const { sessionView } = useKibana().services;
  const { getFieldsData, indexName } = useLeftPanelContext();

  const ancestorIndex = getField(getFieldsData(ANCESTOR_INDEX)); // e.g in case of alert, we want to grab it's origin index
  const sessionEntityId = getField(getFieldsData(ENTRY_LEADER_ENTITY_ID));
  const sessionStartTime = getField(getFieldsData(ENTRY_LEADER_START));
  const index = ancestorIndex || indexName;

  if (!index || !sessionEntityId || !sessionStartTime) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.flyout.left.visualize.sessionView.errorMessageTitle"
              defaultMessage="Unable to display {title}"
              values={{ title: 'session view' }}
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.securitySolution.flyout.left.visualize.sessionView.errorMessageDescription"
              defaultMessage="There was an error displaying {message}"
              values={{ message: 'session view' }}
            />
          </p>
        }
        data-test-subj={SESSION_VIEW_ERROR_TEST_ID}
      />
    );
  }

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
