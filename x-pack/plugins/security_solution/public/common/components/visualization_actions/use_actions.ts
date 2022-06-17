/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { useAddToExistingCase } from './use_add_to_existing_case';
import { useAddToNewCase } from './use_add_to_new_case';

import { useGetUserCasesPermissions } from '../../lib/kibana';
import { ADD_TO_EXISTING_CASE, ADD_TO_NEW_CASE, INSPECT, OPEN_IN_LENS } from './translations';

export type ActionTypes = 'inspect' | 'addToExistingCase' | 'addToNewCase' | 'openInLens';

export function useActions({
  withActions,
  attributes,
  timeRange,
  handleInspectButtonClick,
}: {
  withActions?: boolean | ActionTypes[];

  attributes: AllSeries;

  timeRange: { from: string; to: string };
  handleInspectButtonClick: () => void;
}) {
  const { lens } = useKibana().services;
  const { canUseEditor, navigateToPrefilledEditor } = lens;
  const userPermissions = useGetUserCasesPermissions();
  const userCanCrud = userPermissions?.crud ?? false;
  const [defaultActions, setDefaultActions] = useState([
    'addToNewCase',
    'addToExistingCase',
    'OpenInLens',
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
    closePopover();
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

  const [isPopoverOpen, setPopover] = useState(false);

  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);

  const closePopover = () => {
    setPopover(false);
  };

  const { disabled: isAddToExistingCaseDisabled, onAddToExistingCaseClicked } =
    useAddToExistingCase({
      onAddToCaseClicked: closePopover,
      lensAttributes: attributes,
      timeRange,
      userCanCrud,
    });

  const { onAddToNewCaseClicked, disabled: isAddToNewCaseDisabled } = useAddToNewCase({
    onClick: closePopover,
    timeRange,
    lensAttributes: attributes,
    userCanCrud,
  });

  return defaultActions.map<Action>((action) => {
    if (action === 'addToExistingCase') {
      return getAddToExistingCaseAction({ callback: onAddToExistingCaseClicked });
    }
    if (action === 'addToNewCase') {
      return getAddToNewCaseAction({ callback: onAddToNewCaseClicked });
    }
    if (action === 'openInLens') {
      return getOpenInLensAction({ callback: onOpenInLens });
    }
    if (action === 'inspect') return getInspectAction({ callback: handleInspectButtonClick });
  });
}

const getOpenInLensAction = ({ callback }: { callback: () => void }): Action => {
  return {
    id: 'openInLens',

    getDisplayName(context: ActionExecutionContext<object>): string {
      return OPEN_IN_LENS;
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
  };
};

const getInspectAction = ({ callback }: { callback: () => void }): Action => {
  return {
    id: 'inspect',
    getDisplayName(context: ActionExecutionContext<object>): string {
      return INSPECT;
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
    order: 50,
  };
};

const getSaveAction = ({ callback }: { callback: () => void }): Action => {
  return {
    id: 'expViewSave',
    getDisplayName(context: ActionExecutionContext<object>): string {
      return i18n.translate('xpack.observability.expView.save', {
        defaultMessage: 'Save visualization',
      });
    },
    getIconType(context: ActionExecutionContext<object>): string | undefined {
      return 'save';
    },
    type: 'actionButton',
    async isCompatible(context: ActionExecutionContext<object>): Promise<boolean> {
      return true;
    },
    async execute(context: ActionExecutionContext<object>): Promise<void> {
      callback();
    },
    order: 49,
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
