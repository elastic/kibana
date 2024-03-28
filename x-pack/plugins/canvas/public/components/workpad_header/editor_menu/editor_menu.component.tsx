/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useState } from 'react';

import {
  EuiContextMenu,
  EuiContextMenuItemIcon,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { EmbeddableFactoryDefinition } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { ToolbarPopover } from '@kbn/shared-ux-button-toolbar';
import { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public/actions';
import { BaseVisType, VisTypeAlias } from '@kbn/visualizations-plugin/public';

import { useUiActionsService } from '../../../services';
import {
  addCanvasElementTrigger,
  ADD_CANVAS_ELEMENT_TRIGGER,
} from '../../../state/triggers/add_canvas_element_trigger';
import { CanvasContainer, useCanvasApi } from '../../hooks/use_canvas_api';

const strings = {
  getEditorMenuButtonLabel: () =>
    i18n.translate('xpack.canvas.solutionToolbar.editorMenuButtonLabel', {
      defaultMessage: 'Select type',
    }),
};

interface FactoryGroup {
  id: string;
  appName: string;
  icon: EuiContextMenuItemIcon;
  panelId: number;
  factories: EmbeddableFactoryDefinition[];
}

interface Props {
  factories: EmbeddableFactoryDefinition[];
  promotedVisTypes: BaseVisType[];
  visTypeAliases: VisTypeAlias[];
  createNewVisType: (visType?: BaseVisType | VisTypeAlias) => () => void;
  createNewEmbeddable: (factory: EmbeddableFactoryDefinition) => () => void;
}

export const EditorMenu: FC<Props> = ({
  factories,
  promotedVisTypes,
  visTypeAliases,
  createNewVisType,
  createNewEmbeddable,
}: Props) => {
  const factoryGroupMap: Record<string, FactoryGroup> = {};
  const ungroupedFactories: EmbeddableFactoryDefinition[] = [];
  const uiActions = useUiActionsService();
  const canvasApi = useCanvasApi();

  const [addPanelActions, setAddPanelActions] = useState<Array<Action<object>>>([]);

  let panelCount = 1;

  useEffect(() => {
    let mounted = true;
    async function loadPanelActions() {
      const registeredActions = await uiActions?.getTriggerCompatibleActions?.(
        ADD_CANVAS_ELEMENT_TRIGGER,
        { embeddable: canvasApi }
      );
      if (mounted) setAddPanelActions(registeredActions);
    }
    loadPanelActions();
    return () => {
      mounted = false;
    };
  }, [uiActions, canvasApi]);

  // Maps factories with a group to create nested context menus for each group type
  // and pushes ungrouped factories into a separate array
  factories.forEach((factory: EmbeddableFactoryDefinition, index) => {
    const { grouping } = factory;

    if (grouping) {
      grouping.forEach((group) => {
        if (factoryGroupMap[group.id]) {
          factoryGroupMap[group.id].factories.push(factory);
        } else {
          factoryGroupMap[group.id] = {
            id: group.id,
            appName: group.getDisplayName ? group.getDisplayName({}) : group.id,
            icon: (group.getIconType ? group.getIconType({}) : 'empty') as EuiContextMenuItemIcon,
            factories: [factory],
            panelId: panelCount,
          };

          panelCount++;
        }
      });
    } else {
      ungroupedFactories.push(factory);
    }
  });

  const getVisTypeMenuItem = (visType: BaseVisType): EuiContextMenuPanelItemDescriptor => {
    const { name, title, titleInWizard, description, icon = 'empty' } = visType;
    return {
      name: titleInWizard || title,
      icon: icon as string,
      onClick: createNewVisType(visType),
      'data-test-subj': `visType-${name}`,
      toolTipContent: description,
    };
  };

  const getVisTypeAliasMenuItem = (
    visTypeAlias: VisTypeAlias
  ): EuiContextMenuPanelItemDescriptor => {
    const { name, title, description, icon = 'empty' } = visTypeAlias;

    return {
      name: title,
      icon,
      onClick: createNewVisType(visTypeAlias),
      'data-test-subj': `visType-${name}`,
      toolTipContent: description,
    };
  };

  const getEmbeddableFactoryMenuItem = (
    factory: EmbeddableFactoryDefinition
  ): EuiContextMenuPanelItemDescriptor => {
    const icon = factory?.getIconType ? factory.getIconType() : 'empty';

    const toolTipContent = factory?.getDescription ? factory.getDescription() : undefined;

    return {
      name: factory.getDisplayName(),
      icon,
      toolTipContent,
      onClick: createNewEmbeddable(factory),
      'data-test-subj': `createNew-${factory.type}`,
    };
  };

  const onAddPanelActionClick =
    (action: Action, context: ActionExecutionContext<object>, closePopover: () => void) =>
    (event: React.MouseEvent) => {
      closePopover();
      if (event.currentTarget instanceof HTMLAnchorElement) {
        if (
          !event.defaultPrevented && // onClick prevented default
          event.button === 0 &&
          (!event.currentTarget.target || event.currentTarget.target === '_self') &&
          !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
        ) {
          event.preventDefault();
          action.execute(context);
        }
      } else action.execute(context);
    };

  const getAddPanelActionMenuItems = useCallback(
    (
      api: CanvasContainer,
      actions: Array<Action<object>> | undefined,
      closePopover: () => void
    ) => {
      return (
        actions?.map((item) => {
          const context = {
            embeddable: api,
            trigger: addCanvasElementTrigger,
          };
          const actionName = item.getDisplayName(context);
          return {
            name: actionName,
            icon: item.getIconType(context),
            onClick: onAddPanelActionClick(item, context, closePopover),
            'data-test-subj': `create-action-${actionName}`,
            toolTipContent: item?.getDisplayNameTooltip?.(context),
          };
        }) ?? []
      );
    },
    []
  );

  const getEditorMenuPanels = (closePopover: () => void) => [
    {
      id: 0,
      items: [
        ...visTypeAliases.map(getVisTypeAliasMenuItem),
        ...getAddPanelActionMenuItems(canvasApi, addPanelActions, closePopover),
        ...Object.values(factoryGroupMap).map(({ id, appName, icon, panelId }) => ({
          name: appName,
          icon,
          panel: panelId,
          'data-test-subj': `canvasEditorMenu-${id}Group`,
        })),
        ...ungroupedFactories.map(getEmbeddableFactoryMenuItem),
        ...promotedVisTypes.map(getVisTypeMenuItem),
      ],
    },
    ...Object.values(factoryGroupMap).map(
      ({ appName, panelId, factories: groupFactories }: FactoryGroup) => ({
        id: panelId,
        title: appName,
        items: groupFactories.map(getEmbeddableFactoryMenuItem),
      })
    ),
  ];

  return (
    <ToolbarPopover
      ownFocus
      label={strings.getEditorMenuButtonLabel()}
      panelPaddingSize="none"
      data-test-subj="canvasEditorMenuButton"
    >
      {({ closePopover }: { closePopover: () => void }) => (
        <EuiContextMenu
          initialPanelId={0}
          panels={getEditorMenuPanels(closePopover)}
          data-test-subj="canvasEditorContextMenu"
        />
      )}
    </ToolbarPopover>
  );
};
