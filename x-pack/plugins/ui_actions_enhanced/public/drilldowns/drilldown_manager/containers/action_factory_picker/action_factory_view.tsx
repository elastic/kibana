/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ActionFactory as ActionFactoryUi } from '../../components/action_factory';
import { ActionFactory, BaseActionFactoryContext } from '../../../../dynamic_actions';

export interface ActionFactoryViewProps {
  factory: ActionFactory;
  context: BaseActionFactoryContext;
}

export const ActionFactoryView: React.FC<ActionFactoryViewProps> = ({ factory, context }) => {
  const name = React.useMemo(() => factory.getDisplayName(context), [factory, context]);
  const icon = React.useMemo(() => factory.getIconType(context), [factory, context]);
  const handleChange = React.useCallback(() => {}, []);

  return <ActionFactoryUi name={name} icon={icon} beta={factory.isBeta} onChange={handleChange} />;
};
