/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiPanel } from '@elastic/eui';

import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';
import type { TimelinesStartServices } from '../../../../../types';
//import * as timelineMarkdownPlugin from '../../../common/components/markdown_editor/plugins/timeline';
import { useInsertTimeline } from '../../../../../hooks/use_insert_timeline';
import { APP_ID, SecurityPageName, getCaseDetailsUrl, getCaseUrl } from '../add_to_case_action';

export const Create = React.memo(() => {
  const {
    cases,
    application: { navigateToApp },
  } = useKibana<TimelinesStartServices>().services;

  const currentSearch = window.location.search;
  const search = useMemo(() => currentSearch, [currentSearch]);
  const onSuccess = useCallback(
    async ({ id }) =>
      navigateToApp(APP_ID, {
        deepLinkId: SecurityPageName.case,
        path: getCaseDetailsUrl({ id, search }),
      }),
    [navigateToApp, search]
  );
  const handleSetIsCancel = useCallback(
    async () =>
      navigateToApp(APP_ID, {
        deepLinkId: SecurityPageName.case,
        path: getCaseUrl(search),
      }),
    [navigateToApp, search]
  );

  return (
    <EuiPanel hasBorder>
      {cases.getCreateCase({
        onCancel: handleSetIsCancel,
        onSuccess,
        timelineIntegration: {
          // editor_plugins: {
          //   parsingPlugin: timelineMarkdownPlugin.parser,
          //   processingPluginRenderer: timelineMarkdownPlugin.renderer,
          //   uiPlugin: timelineMarkdownPlugin.plugin,
          // },
          hooks: {
            useInsertTimeline,
          },
        },
        owner: [APP_ID],
      })}
    </EuiPanel>
  );
});

Create.displayName = 'Create';
