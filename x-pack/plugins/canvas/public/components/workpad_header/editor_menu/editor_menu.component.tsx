/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import {
  EuiContextMenu,
  EuiContextMenuPanelItemDescriptor,
  EuiContextMenuItemIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmbeddableFactoryDefinition } from '@kbn/embeddable-plugin/public';
import { BaseVisType, VisTypeAlias } from '@kbn/visualizations-plugin/public';
import { SolutionToolbarPopover } from '@kbn/presentation-util-plugin/public';

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
  isDarkThemeEnabled?: boolean;
  promotedVisTypes: BaseVisType[];
  visTypeAliases: VisTypeAlias[];
  createNewVisType: (visType?: BaseVisType | VisTypeAlias) => () => void;
  createNewEmbeddable: (factory: EmbeddableFactoryDefinition) => () => void;
}

export const EditorMenu: FC<Props> = ({
  factories,
  isDarkThemeEnabled,
  promotedVisTypes,
  visTypeAliases,
  createNewVisType,
  createNewEmbeddable,
}: Props) => {
  const factoryGroupMap: Record<string, FactoryGroup> = {};
  const ungroupedFactories: EmbeddableFactoryDefinition[] = [];

  let panelCount = 1;

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

  const editorMenuPanels = [
    {
      id: 0,
      items: [
        ...visTypeAliases.map(getVisTypeAliasMenuItem),
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
    <SolutionToolbarPopover
      ownFocus
      label={strings.getEditorMenuButtonLabel()}
      iconType="arrowDown"
      iconSide="right"
      panelPaddingSize="none"
      data-test-subj="canvasEditorMenuButton"
    >
      {() => (
        <EuiContextMenu
          initialPanelId={0}
          panels={editorMenuPanels}
          className={`canvasSolutionToolbar__editorContextMenu ${
            isDarkThemeEnabled
              ? 'canvasSolutionToolbar__editorContextMenu--dark'
              : 'canvasSolutionToolbar__editorContextMenu--light'
          }`}
          data-test-subj="canvasEditorContextMenu"
        />
      )}
    </SolutionToolbarPopover>
  );
};
