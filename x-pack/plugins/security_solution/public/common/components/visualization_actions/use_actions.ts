/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { Action, Trigger } from '@kbn/ui-actions-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { useKibana } from '../../lib/kibana/kibana_react';
import { useAddToExistingCase } from './use_add_to_existing_case';
import { useAddToNewCase } from './use_add_to_new_case';
import { useSaveToLibrary } from './use_save_to_library';

import {
  ADDED_TO_LIBRARY,
  ADD_TO_EXISTING_CASE,
  ADD_TO_NEW_CASE,
  OPEN_IN_LENS,
} from './translations';
import type { LensAttributes } from './types';
import { VisualizationContextMenuActions } from './types';
import { INSPECT } from '../inspect/translations';

export const DEFAULT_ACTIONS: VisualizationContextMenuActions[] = [
  VisualizationContextMenuActions.inspect,
  VisualizationContextMenuActions.addToNewCase,
  VisualizationContextMenuActions.addToExistingCase,
  VisualizationContextMenuActions.saveToLibrary,
  VisualizationContextMenuActions.openInLens,
];

export const INSPECT_ACTION: VisualizationContextMenuActions[] = [
  VisualizationContextMenuActions.inspect,
];

export const VISUALIZATION_CONTEXT_MENU_TRIGGER: Trigger = {
  id: 'VISUALIZATION_CONTEXT_MENU_TRIGGER',
};

export const useActions = ({
  attributes,
  extraActions,
  inspectActionProps,
  timeRange,
  withActions = [],
}: {
  attributes: LensAttributes | null;
  extraActions?: Action[];
  inspectActionProps: {
    handleInspectClick: () => void;
    isInspectButtonDisabled: boolean;
  };
  timeRange: { from: string; to: string };
  withActions?: VisualizationContextMenuActions[];
}) => {
  const { lens } = useKibana().services;
  const { navigateToPrefilledEditor, canUseEditor } = lens;

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

  const { openSaveVisualizationFlyout, disableVisualizations } = useSaveToLibrary({ attributes });

  const actions = useMemo(
    () =>
      withActions?.reduce<Action[]>((acc, action) => {
        if (action === VisualizationContextMenuActions.inspect) {
          acc.push(
            getInspectAction({
              execute: async () => inspectActionProps.handleInspectClick(),
              disabled: inspectActionProps.isInspectButtonDisabled,
            })
          );
        }
        if (action === VisualizationContextMenuActions.addToExistingCase) {
          acc.push(
            getAddToExistingCaseAction({
              execute: async () => {
                onAddToExistingCaseClicked();
              },
              disabled: isAddToExistingCaseDisabled,
            })
          );
        }
        if (action === VisualizationContextMenuActions.addToNewCase) {
          acc.push(
            getAddToNewCaseAction({
              execute: async () => onAddToNewCaseClicked(),
              disabled: isAddToNewCaseDisabled,
            })
          );
        }
        if (action === VisualizationContextMenuActions.openInLens) {
          acc.push(
            getOpenInLensActions({
              execute: async () => {
                onOpenInLens();
              },
              isCompatible: async () => canUseEditor(),
            })
          );
        }

        if (action === VisualizationContextMenuActions.saveToLibrary) {
          acc.push(
            getSaveToLibraryAction({
              execute: async () => {
                openSaveVisualizationFlyout();
              },
              disabled: disableVisualizations,
            })
          );
        }

        return acc;
      }, []),
    [
      withActions,
      inspectActionProps,
      isAddToExistingCaseDisabled,
      onAddToExistingCaseClicked,
      isAddToNewCaseDisabled,
      onAddToNewCaseClicked,
      onOpenInLens,
      canUseEditor,
      disableVisualizations,
      openSaveVisualizationFlyout,
    ]
  );

  const withExtraActions = actions.concat(extraActions ?? []).map((a, i, totalActions) => {
    const order = Math.max(totalActions.length - (1 + i), 0);
    return {
      ...a,
      order,
    };
  });

  return withExtraActions;
};

const getOpenInLensActions = ({
  execute,
  isCompatible,
}: {
  execute: ActionDefinition['execute'];
  isCompatible: ActionDefinition['isCompatible'];
}): Action =>
  createAction({
    id: VisualizationContextMenuActions.openInLens,
    isCompatible,
    getDisplayName: () => OPEN_IN_LENS,
    getIconType: () => 'visArea',
    type: 'actionButton',
    execute,
    order: 0,
  });

const getSaveToLibraryAction = ({
  execute,
  disabled,
}: {
  execute: ActionDefinition['execute'];
  disabled: ActionDefinition['disabled'];
}): Action =>
  createAction({
    id: VisualizationContextMenuActions.saveToLibrary,
    getDisplayName: () => ADDED_TO_LIBRARY,
    getIconType: () => 'save',
    type: 'actionButton',
    execute,
    disabled,
    order: 1,
  });

const getAddToExistingCaseAction = ({
  execute,
  disabled,
}: {
  execute: ActionDefinition['execute'];
  disabled: ActionDefinition['disabled'];
}): Action =>
  createAction({
    id: VisualizationContextMenuActions.addToExistingCase,
    getDisplayName: () => ADD_TO_EXISTING_CASE,
    getIconType: () => 'casesApp',
    type: 'actionButton',
    execute,
    disabled,
    order: 2,
  });

const getAddToNewCaseAction = ({
  execute,
  disabled,
}: {
  execute: ActionDefinition['execute'];
  disabled: ActionDefinition['disabled'];
}): Action =>
  createAction({
    id: VisualizationContextMenuActions.addToNewCase,
    getDisplayName: () => ADD_TO_NEW_CASE,
    getIconType: () => 'casesApp',
    type: 'actionButton',
    execute,
    disabled,
    order: 3,
  });

const getInspectAction = ({
  execute,
  disabled,
}: {
  execute: () => void;
  disabled?: boolean;
}): Action =>
  createAction({
    id: VisualizationContextMenuActions.inspect,
    getDisplayName: () => INSPECT,
    getIconType: () => 'inspect',
    type: 'actionButton',
    execute: async () => {
      execute();
    },
    disabled,
    order: 4,
  });
