/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { ActionFactory, BaseActionFactoryContext } from '../../dynamic_actions';

export function useCompatibleActionFactoriesForCurrentContext<
  Context extends BaseActionFactoryContext = BaseActionFactoryContext
>(actionFactories: ActionFactory[], context: Context) {
  const [compatibleActionFactories, setCompatibleActionFactories] = useState<ActionFactory[]>();
  useEffect(() => {
    let canceled = false;
    async function updateCompatibleFactoriesForContext() {
      const compatibility = await Promise.all(
        actionFactories.map((factory) => factory.isCompatible(context))
      );
      if (canceled) return;

      const compatibleFactories = actionFactories.filter((_, i) => compatibility[i]);
      const triggerSupportedFactories = compatibleFactories.filter((factory) =>
        factory.supportedTriggers().some((trigger) => context.triggers.includes(trigger))
      );
      setCompatibleActionFactories(triggerSupportedFactories);
    }
    updateCompatibleFactoriesForContext();
    return () => {
      canceled = true;
    };
  }, [context, actionFactories, context.triggers]);

  return compatibleActionFactories;
}
