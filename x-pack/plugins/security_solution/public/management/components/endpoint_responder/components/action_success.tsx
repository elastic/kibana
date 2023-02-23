/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { endpointActionResponseCodes } from '../lib/endpoint_action_response_codes';
import type { ActionDetails, MaybeImmutable } from '../../../../../common/endpoint/types';
import type { CommandExecutionResultComponent, CommandExecutionResultProps } from '../../console';

export interface ActionSuccessProps extends CommandExecutionResultProps {
  action: MaybeImmutable<ActionDetails<{ code?: string }>>;
  ResultComponent: CommandExecutionResultComponent;
}

/**
 * Display generic success message for all actions
 */
export const ActionSuccess = memo<ActionSuccessProps>(
  ({ action, ResultComponent, title: _title, ...props }) => {
    const title = useMemo(() => {
      if (_title) {
        return _title;
      }

      const firstAgentId = action.agents[0];
      const actionOutputCode = action.outputs?.[firstAgentId]?.content?.code;

      return actionOutputCode ? endpointActionResponseCodes[actionOutputCode] : undefined;
    }, [_title, action.agents, action.outputs]);

    return <ResultComponent {...props} title={title} />;
  }
);
ActionSuccess.displayName = 'ActionSuccess';
