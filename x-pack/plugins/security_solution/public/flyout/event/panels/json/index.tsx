/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { JSONPanel } from '../../../../common/store/flyout/model';
import { BackToAlertDetailsButton } from '../../components/back_to_alert_details';
import { useEventDetailsPanelContext } from '../event/context';
import { JsonView } from '../../../../common/components/event_details/json_view';

export const EventJSONPanelKey: JSONPanel['panelKind'] = 'json';

// TODO: If we want JSON as a panel, use the below

export const EventJSONPanel: React.FC = React.memo(() => {
  const { searchHit } = useEventDetailsPanelContext();
  return (
    <>
      {searchHit && (
        <div style={{ padding: '20px' }}>
          <BackToAlertDetailsButton />
          <div
            css={css`
              height: 100%;
              position: relative;
            `}
            data-test-subj="jsonViewWrapper"
          >
            <JsonView rawEventData={searchHit} />
          </div>
        </div>
      )}
    </>
  );
});

EventJSONPanel.displayName = 'EventJSON';

// TODO: If we want JSON as a tab, use the below:

export const EventJSONTab: React.FC = React.memo(() => {
  const { searchHit } = useEventDetailsPanelContext();
  return (
    <div
      css={css`
        height: 100%;
        position: relative;
      `}
      data-test-subj="jsonViewWrapper"
    >
      <JsonView rawEventData={searchHit} />
    </div>
  );
});

EventJSONTab.displayName = 'EventJSONTab';
