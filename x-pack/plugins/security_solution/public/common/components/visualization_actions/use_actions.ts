/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { useKibana } from '../../lib/kibana/kibana_react';
import { useAddToExistingCase } from './use_add_to_existing_case';
import { useAddToNewCase } from './use_add_to_new_case';

import { useGetUserCasesPermissions } from '../../lib/kibana';
import { ADD_TO_EXISTING_CASE, ADD_TO_NEW_CASE, OPEN_IN_LENS } from './translations';
import { LensAttributes } from './types';

export type ActionTypes = 'addToExistingCase' | 'addToNewCase' | 'openInLens';

export function useActions({
  withActions,
  attributes,
  timeRange,
}: {
  withActions?: boolean | ActionTypes[];

  attributes: LensAttributes | null;

  timeRange: { from: string; to: string };
}) {
  const { lens } = useKibana().services;
  const { navigateToPrefilledEditor } = lens;
  const userPermissions = useGetUserCasesPermissions();
  const userCanCrud = userPermissions?.crud ?? false;
  const [defaultActions, setDefaultActions] = useState([
    'openInLens',
    'addToNewCase',
    'addToExistingCase',
  ]);

  useEffect(() => {
    if (withActions === false) {
      setDefaultActions([]);
    }
    if (Array.isArray(withActions)) {
      setDefaultActions(withActions);
    }
  }, [withActions]);

  const onOpenInLens = useCallback(() => {
    if (!timeRange || !attributes) {
      return;
    }
    navigateToPrefilledEditor(
      {
        id: '',
        timeRange,
        attributes,
      },
      {
        openInNewTab: true,
      }
    );
  }, [attributes, navigateToPrefilledEditor, timeRange]);

  const { disabled: isAddToExistingCaseDisabled, onAddToExistingCaseClicked } =
    useAddToExistingCase({
      lensAttributes: attributes,
      timeRange,
      userCanCrud,
    });

  const { onAddToNewCaseClicked, disabled: isAddToNewCaseDisabled } = useAddToNewCase({
    timeRange,
    lensAttributes: attributes,
    userCanCrud,
  });

  return defaultActions.reduce<Action[]>((acc, action) => {
    if (action === 'addToExistingCase') {
      return [...acc, getAddToExistingCaseAction({ callback: onAddToExistingCaseClicked })];
    }
    if (action === 'addToNewCase') {
      return [...acc, getAddToNewCaseAction({ callback: onAddToNewCaseClicked })];
    }
    if (action === 'openInLens') {
      return [...acc, getOpenInLensAction({ callback: onOpenInLens })];
    }

    return acc;
  }, []);
}

const getOpenInLensAction = ({ callback }: { callback: () => void }): Action => {
  return {
    id: 'openInLens',

    getDisplayName(context: ActionExecutionContext<object>): string {
      return OPEN_IN_LENS;
    },
    getIconType(context: ActionExecutionContext<object>): string | undefined {
      return 'visArea';
    },
    type: 'actionButton',
    async isCompatible(context: ActionExecutionContext<object>): Promise<boolean> {
      return true;
    },
    async execute(context: ActionExecutionContext<object>): Promise<void> {
      callback();
    },
  };
};

const getAddToNewCaseAction = ({ callback }: { callback: () => void }): Action => {
  return {
    id: 'addToNewCase',
    getDisplayName(context: ActionExecutionContext<object>): string {
      return ADD_TO_NEW_CASE;
    },
    getIconType(context: ActionExecutionContext<object>): string | undefined {
      return 'plusInCircle';
    },
    type: 'actionButton',
    async isCompatible(context: ActionExecutionContext<object>): Promise<boolean> {
      return true;
    },
    async execute(context: ActionExecutionContext<object>): Promise<void> {
      callback();
    },
    order: 48,
  };
};

const getAddToExistingCaseAction = ({ callback }: { callback: () => void }): Action => {
  return {
    id: 'addToExistingCase',
    getDisplayName(context: ActionExecutionContext<object>): string {
      return ADD_TO_EXISTING_CASE;
    },
    getIconType(context: ActionExecutionContext<object>): string | undefined {
      return 'plusInCircle';
    },
    type: 'actionButton',
    async isCompatible(context: ActionExecutionContext<object>): Promise<boolean> {
      return true;
    },
    async execute(context: ActionExecutionContext<object>): Promise<void> {
      callback();
    },
    order: 48,
  };
};
