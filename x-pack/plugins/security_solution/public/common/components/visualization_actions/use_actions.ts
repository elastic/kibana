/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { useKibana } from '../../lib/kibana/kibana_react';
import { useAddToExistingCase } from './use_add_to_existing_case';
import { useAddToNewCase } from './use_add_to_new_case';

import { ADD_TO_EXISTING_CASE, ADD_TO_NEW_CASE, OPEN_IN_LENS } from './translations';
import type { LensAttributes } from './types';
import { INSPECT } from '../inspect/translations';

export type ActionTypes = 'addToExistingCase' | 'addToNewCase' | 'openInLens';

export const useActions = ({
  attributes,
  extraActions,
  inspectActionProps,
  timeRange,
  withActions,
}: {
  attributes: LensAttributes | null;
  extraActions?: Action[];
  inspectActionProps?: { onInspectActionClicked: () => void; isDisabled: boolean };
  timeRange: { from: string; to: string };
  withActions?: boolean;
}) => {
  const { lens } = useKibana().services;
  const { navigateToPrefilledEditor } = lens;
  const [defaultActions, setDefaultActions] = useState([
    'inspect',
    'addToNewCase',
    'addToExistingCase',
    'openInLens',
  ]);

  useEffect(() => {
    if (withActions === false) {
      setDefaultActions([]);
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
    });

  const { onAddToNewCaseClicked, disabled: isAddToNewCaseDisabled } = useAddToNewCase({
    timeRange,
    lensAttributes: attributes,
  });

  const actions = useMemo(
    () =>
      defaultActions?.reduce<Action[]>((acc, action) => {
        if (action === 'inspect' && inspectActionProps != null) {
          return [
            ...acc,
            getInspectAction({
              callback: inspectActionProps?.onInspectActionClicked,
              disabled: inspectActionProps?.isDisabled,
            }),
          ];
        }
        if (action === 'addToExistingCase') {
          return [
            ...acc,
            getAddToExistingCaseAction({
              callback: onAddToExistingCaseClicked,
              disabled: isAddToExistingCaseDisabled,
            }),
          ];
        }
        if (action === 'addToNewCase') {
          return [
            ...acc,
            getAddToNewCaseAction({
              callback: onAddToNewCaseClicked,
              disabled: isAddToNewCaseDisabled,
            }),
          ];
        }
        if (action === 'openInLens') {
          return [...acc, getOpenInLensAction({ callback: onOpenInLens })];
        }

        return acc;
      }, []),
    [
      defaultActions,
      inspectActionProps,
      onAddToExistingCaseClicked,
      isAddToExistingCaseDisabled,
      onAddToNewCaseClicked,
      isAddToNewCaseDisabled,
      onOpenInLens,
    ]
  );

  const withExtraActions = actions.concat(extraActions ?? []);

  return withExtraActions;
};

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
    order: 1,
  };
};

const getAddToNewCaseAction = ({
  callback,
  disabled,
}: {
  callback: () => void;
  disabled?: boolean;
}): Action => {
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
    disabled,
    order: 3,
  };
};

const getInspectAction = ({
  callback,
  disabled,
}: {
  callback: () => void;
  disabled?: boolean;
}): Action => {
  return {
    id: 'inspect',
    getDisplayName(context: ActionExecutionContext<object>): string {
      return INSPECT;
    },
    getIconType(context: ActionExecutionContext<object>): string | undefined {
      return 'inspect';
    },
    type: 'actionButton',
    async isCompatible(context: ActionExecutionContext<object>): Promise<boolean> {
      return true;
    },
    async execute(context: ActionExecutionContext<object>): Promise<void> {
      callback();
    },
    disabled,
    order: 4,
  };
};

const getAddToExistingCaseAction = ({
  callback,
  disabled,
}: {
  callback: () => void;
  disabled?: boolean;
}): Action => {
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
    disabled,
    order: 2,
  };
};
