/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actions, ActorRef } from 'xstate';
import { ResolvedLogView } from '../../../../common/log_views';
import { logViewContextWithIdRT } from './types';

export type ListenerEvents =
  | {
      type: 'loadingLogView';
      logViewId: string;
    }
  | {
      type: 'loadedLogView';
      resolvedLogView: ResolvedLogView;
    };

export const createListeners = (target: ActorRef<ListenerEvents> | string) => {
  return {
    notifyLoading: actions.pure((context) =>
      logViewContextWithIdRT.is(context)
        ? [
            actions.send(
              {
                type: 'loadingLogView',
                logViewId: context.logViewId,
              } as ListenerEvents,
              { to: target }
            ),
          ]
        : undefined
    ),
  };
};
