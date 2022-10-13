/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';

interface ContextProps {
  triggersActionsUI: TriggersAndActionsUIPublicPluginStart | null;
}

export const TriggerActionsContext = React.createContext<ContextProps>({
  triggersActionsUI: null,
});

interface Props {
  triggersActionsUI: TriggersAndActionsUIPublicPluginStart;
}

export const TriggersActionsProvider: React.FC<Props> = (props) => {
  return (
    <TriggerActionsContext.Provider
      value={{
        triggersActionsUI: props.triggersActionsUI,
      }}
    >
      {props.children}
    </TriggerActionsContext.Provider>
  );
};
