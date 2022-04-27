/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { BaseVisType, VisGroups, VisTypeAlias } from '@kbn/visualizations-plugin/public';
import { EmbeddableFactoryDefinition, EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { trackCanvasUiMetric, METRIC_TYPE } from '../../../lib/ui_metric';
import {
  useEmbeddablesService,
  usePlatformService,
  useVisualizationsService,
} from '../../../services';
import { CANVAS_APP } from '../../../../common/lib';
import { encode } from '../../../../common/lib/embeddable_dataurl';
import { ElementSpec } from '../../../../types';
import { EditorMenu as Component } from './editor_menu.component';

interface Props {
  /**
   * Handler for adding a selected element to the workpad
   */
  addElement: (element: Partial<ElementSpec>) => void;
}

export const EditorMenu: FC<Props> = ({ addElement }) => {
  const embeddablesService = useEmbeddablesService();
  const { pathname, search } = useLocation();
  const platformService = usePlatformService();
  const stateTransferService = embeddablesService.getStateTransfer();
  const visualizationsService = useVisualizationsService();
  const IS_DARK_THEME = platformService.getUISetting('theme:darkMode');

  const createNewVisType = useCallback(
    (visType?: BaseVisType | VisTypeAlias) => () => {
      let path = '';
      let appId = '';

      if (visType) {
        if (trackCanvasUiMetric) {
          trackCanvasUiMetric(METRIC_TYPE.CLICK, `${visType.name}:create`);
        }

        if ('aliasPath' in visType) {
          appId = visType.aliasApp;
          path = visType.aliasPath;
        } else {
          appId = 'visualize';
          path = `#/create?type=${encodeURIComponent(visType.name)}`;
        }
      } else {
        appId = 'visualize';
        path = '#/create?';
      }

      stateTransferService.navigateToEditor(appId, {
        path,
        state: {
          originatingApp: CANVAS_APP,
          originatingPath: `#/${pathname}${search}`,
        },
      });
    },
    [stateTransferService, pathname, search]
  );

  const createNewEmbeddable = useCallback(
    (factory: EmbeddableFactoryDefinition) => async () => {
      if (trackCanvasUiMetric) {
        trackCanvasUiMetric(METRIC_TYPE.CLICK, factory.type);
      }
      let embeddableInput;
      if (factory.getExplicitInput) {
        embeddableInput = await factory.getExplicitInput();
      } else {
        const newEmbeddable = await factory.create({} as EmbeddableInput);
        embeddableInput = newEmbeddable?.getInput();
      }

      if (embeddableInput) {
        const config = encode(embeddableInput);
        const expression = `embeddable config="${config}"
  type="${factory.type}"
| render`;

        addElement({ expression });
      }
    },
    [addElement]
  );

  const getVisTypesByGroup = (group: VisGroups): BaseVisType[] =>
    visualizationsService
      .getByGroup(group)
      .sort(({ name: a }: BaseVisType | VisTypeAlias, { name: b }: BaseVisType | VisTypeAlias) => {
        if (a < b) {
          return -1;
        }
        if (a > b) {
          return 1;
        }
        return 0;
      })
      .filter(({ hidden }: BaseVisType) => !hidden);

  const visTypeAliases = visualizationsService
    .getAliases()
    .sort(({ promotion: a = false }: VisTypeAlias, { promotion: b = false }: VisTypeAlias) =>
      a === b ? 0 : a ? -1 : 1
    );

  const factories = embeddablesService
    ? Array.from(embeddablesService.getEmbeddableFactories()).filter(
        ({ type, isEditable, canCreateNew, isContainerType }) =>
          // @ts-expect-error ts 4.5 upgrade
          isEditable() &&
          !isContainerType &&
          canCreateNew() &&
          !['visualization', 'ml'].some((factoryType) => {
            return type.includes(factoryType);
          })
      )
    : [];

  const promotedVisTypes = getVisTypesByGroup(VisGroups.PROMOTED);

  return (
    <Component
      createNewVisType={createNewVisType}
      createNewEmbeddable={createNewEmbeddable}
      promotedVisTypes={promotedVisTypes}
      isDarkThemeEnabled={IS_DARK_THEME}
      factories={factories}
      visTypeAliases={visTypeAliases}
    />
  );
};
