/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ToastsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import React, { createContext, useCallback, useContext } from 'react';

import type { CatalogItem } from '../api';
import { addQueryAttachment, hasQuery } from './add_query_attachment';
import type { AgentBuilderStager } from './agent_builder_stager';
import { useAgentBuilderAccess } from './use_agent_builder_access';

export type AddQueryToAgent = (entry: CatalogItem) => void;

/** Absent when Agent Builder is off or the user cannot chat. */
export const AddQueryToAgentContext = createContext<AddQueryToAgent | undefined>(undefined);

/** Absent until the user can chat with Agent Builder. */
export const useAddQueryToAgent = ({
  agentBuilder,
  stager,
  toasts,
}: {
  agentBuilder: Pick<AgentBuilderPluginStart, 'getAgentBuilderAccess'> | undefined;
  stager: Pick<AgentBuilderStager, 'addQuery'> | undefined;
  toasts: Pick<ToastsStart, 'addSuccess'>;
}): AddQueryToAgent | undefined => {
  const canChat = useAgentBuilderAccess(agentBuilder);

  const addQuery = useCallback(
    (entry: CatalogItem) => {
      if (stager !== undefined) addQueryAttachment({ stager, toasts }, entry);
    },
    [stager, toasts]
  );

  return canChat && stager !== undefined ? addQuery : undefined;
};

const addQueryLabel = i18n.translate('xpack.codeIntelligence.agentBuilder.addQueryAriaLabel', {
  defaultMessage: 'Add query to AI Agent',
});

export const AddQueryToAgentButtonIcon = ({ entry }: { entry: CatalogItem }) => {
  const addQuery = useContext(AddQueryToAgentContext);
  if (addQuery === undefined || !hasQuery(entry)) return null;
  return (
    <EuiToolTip content={addQueryLabel} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="addToChat"
        aria-label={addQueryLabel}
        size="xs"
        data-test-subj="codeIntelligenceCatalogRowAddToAgent"
        onClick={(event: React.MouseEvent) => {
          event.stopPropagation();
          addQuery(entry);
        }}
      />
    </EuiToolTip>
  );
};

export const AddQueryToAgentButton = ({ entry }: { entry: CatalogItem }) => {
  const addQuery = useContext(AddQueryToAgentContext);
  if (addQuery === undefined || !hasQuery(entry)) return null;
  return (
    <EuiButton
      iconType="addToChat"
      size="s"
      data-test-subj="codeIntelligenceCatalogEntryFlyoutAddToAgent"
      onClick={() => addQuery(entry)}
    >
      {i18n.translate('xpack.codeIntelligence.agentBuilder.addQueryButton', {
        defaultMessage: 'Add to AI Agent',
      })}
    </EuiButton>
  );
};
