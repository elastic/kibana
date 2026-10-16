/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import type { AgentBuilderStager } from './agent_builder_stager';
import { buildPageContextAttachment, type PageContext } from './page_context';

/** Keeps the AI Agent informed about what the page shows. */
export const useAgentBuilderPageContext = ({
  stager,
  context,
}: {
  stager: AgentBuilderStager | undefined;
  context: PageContext | undefined;
}): void => {
  const url = window.location.href;
  const attachment = useMemo(
    () => (context === undefined ? undefined : buildPageContextAttachment(context, url)),
    [context, url]
  );

  useEffect(() => {
    if (stager !== undefined && attachment !== undefined) stager.setPageContext(attachment);
  }, [stager, attachment]);
};
