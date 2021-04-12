/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiPanel } from '@elastic/eui';
import { useHistory } from 'react-router-dom';

import { getCaseDetailsUrl } from '../../../common/components/link_to';
import { useKibana } from '../../../common/lib/kibana';
import * as timelineMarkdownPlugin from '../../../common/components/markdown_editor/plugins/timeline';
import { useInsertTimeline } from '../use_insert_timeline';

export const Create = React.memo(() => {
  const { cases } = useKibana().services;
  const history = useHistory();
  const onSuccess = useCallback(
    async ({ id }) => {
      history.push(getCaseDetailsUrl({ id }));
    },
    [history]
  );

  const handleSetIsCancel = useCallback(() => {
    history.push('/');
  }, [history]);

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
      })}
    </EuiPanel>
  );
});

Create.displayName = 'Create';
