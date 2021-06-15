/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiPanel } from '@elastic/eui';

import { getCaseDetailsUrl, getCaseUrl } from '../../../common/components/link_to';
import { useKibana } from '../../../common/lib/kibana';
import * as timelineMarkdownPlugin from '../../../common/components/markdown_editor/plugins/timeline';
import { useInsertTimeline } from '../use_insert_timeline';
import { APP_ID, CASES_APP_ID, SecurityPageName } from '../../../../common/constants';
import { useGetUrlSearch } from '../../../common/components/navigation/use_get_url_search';
import { navTabs } from '../../../app/home/home_navigations';

export const Create = React.memo(() => {
  const {
    cases,
    application: { navigateToApp },
  } = useKibana().services;
  const search = useGetUrlSearch(navTabs.case);
  const onSuccess = useCallback(
    async ({ id }) =>
      navigateToApp(CASES_APP_ID, {
        path: getCaseDetailsUrl({ id, search }),
      }),
    [navigateToApp, search]
  );
  const handleSetIsCancel = useCallback(
    async () =>
      navigateToApp(CASES_APP_ID, {
        path: getCaseUrl(search),
      }),
    [navigateToApp, search]
  );

  return (
    <EuiPanel>
      {cases.getCreateCase({
        onCancel: handleSetIsCancel,
        onSuccess,
        timelineIntegration: {
          editor_plugins: {
            parsingPlugin: timelineMarkdownPlugin.parser,
            processingPluginRenderer: timelineMarkdownPlugin.renderer,
            uiPlugin: timelineMarkdownPlugin.plugin,
          },
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
