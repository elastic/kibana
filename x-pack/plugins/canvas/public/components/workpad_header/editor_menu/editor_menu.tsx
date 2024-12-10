/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  VisGroups,
  type BaseVisType,
  type VisTypeAlias,
  type VisParams,
} from '@kbn/visualizations-plugin/public';
import {
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  EmbeddableInput,
} from '@kbn/embeddable-plugin/public';
import { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public/actions';

import { trackCanvasUiMetric, METRIC_TYPE } from '../../../lib/ui_metric';
import { CANVAS_APP } from '../../../../common/lib';
import { ElementSpec } from '../../../../types';
import { EditorMenu as Component } from './editor_menu.component';
import { embeddableInputToExpression } from '../../../../canvas_plugin_src/renderers/embeddable/embeddable_input_to_expression';
import { EmbeddableInput as CanvasEmbeddableInput } from '../../../../canvas_plugin_src/expression_types';
import { useCanvasApi } from '../../hooks/use_canvas_api';
import { ADD_CANVAS_ELEMENT_TRIGGER } from '../../../state/triggers/add_canvas_element_trigger';
import {
  embeddableService,
  uiActionsService,
  visualizationsService,
} from '../../../services/kibana_services';

interface Props {
  /**
   * Handler for adding a selected element to the workpad
   */
  addElement: (element: Partial<ElementSpec>) => void;
}

interface UnwrappedEmbeddableFactory {
  factory: EmbeddableFactory;
  isEditable: boolean;
}

export const EditorMenu: FC<Props> = ({ addElement }) => {
  const { pathname, search, hash } = useLocation();
  const stateTransferService = embeddableService.getStateTransfer();
  const canvasApi = useCanvasApi();

  const [addPanelActions, setAddPanelActions] = useState<Array<Action<object>>>([]);

  const embeddableFactories = useMemo(
    () => (embeddableService ? Array.from(embeddableService.getEmbeddableFactories()) : []),
    []
  );

  const [unwrappedEmbeddableFactories, setUnwrappedEmbeddableFactories] = useState<
    UnwrappedEmbeddableFactory[]
  >([]);

  useEffect(() => {
    Promise.all(
      embeddableFactories.map<Promise<UnwrappedEmbeddableFactory>>(async (factory) => ({
        factory,
        isEditable: await factory.isEditable(),
      }))
    ).then((factories) => {
      setUnwrappedEmbeddableFactories(factories);
    });
  }, [embeddableFactories]);

  useEffect(() => {
    let mounted = true;
    async function loadPanelActions() {
      const registeredActions = await uiActionsService.getTriggerCompatibleActions(
        ADD_CANVAS_ELEMENT_TRIGGER,
        { embeddable: canvasApi }
      );
      if (mounted) setAddPanelActions(registeredActions);
    }
    loadPanelActions();
    return () => {
      mounted = false;
    };
  }, [canvasApi]);

  const createNewVisType = useCallback(
    (visType?: BaseVisType | VisTypeAlias) => () => {
      let path = '';
      let appId = '';

      if (visType) {
        if (trackCanvasUiMetric) {
          trackCanvasUiMetric(METRIC_TYPE.CLICK, `${visType.name}:create`);
        }

        if (!('alias' in visType)) {
          // this visualization is not an alias
          appId = 'visualize';
          path = `#/create?type=${encodeURIComponent(visType.name)}`;
        } else if (visType.alias && 'path' in visType.alias) {
          // this visualization **is** an alias, and it has an app to redirect to for creation
          appId = visType.alias.app;
          path = visType.alias.path;
        }
      } else {
        appId = 'visualize';
        path = '#/create?';
      }

      stateTransferService.navigateToEditor(appId, {
        path,
        state: {
          originatingApp: CANVAS_APP,
          originatingPath: `${pathname}${search}${hash}`,
        },
      });
    },
    [stateTransferService, pathname, search, hash]
  );

  const createNewEmbeddableFromFactory = useCallback(
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
        const expression = embeddableInputToExpression(
          embeddableInput as CanvasEmbeddableInput,
          factory.type,
          undefined,
          true
        );
        addElement({ expression });
      }
    },
    [addElement]
  );

  const createNewEmbeddableFromAction = useCallback(
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
      },
    []
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
      .filter(({ disableCreate }: BaseVisType) => !disableCreate);

  const visTypeAliases = visualizationsService
    .getAliases()
    .sort(({ promotion: a = false }: VisTypeAlias, { promotion: b = false }: VisTypeAlias) =>
      a === b ? 0 : a ? -1 : 1
    )
    .filter(({ disableCreate }: VisTypeAlias) => !disableCreate);

  const factories = unwrappedEmbeddableFactories
    .filter(
      ({ isEditable, factory: { type, canCreateNew, isContainerType } }) =>
        isEditable &&
        !isContainerType &&
        canCreateNew() &&
        !['visualization', 'ml', 'links'].some((factoryType) => {
          return type.includes(factoryType);
        })
    )
    .map(({ factory }) => factory);

  const promotedVisTypes = getVisTypesByGroup(VisGroups.PROMOTED);
  const legacyVisTypes = getVisTypesByGroup(VisGroups.LEGACY);

  return (
    <Component
      createNewVisType={createNewVisType}
      createNewEmbeddableFromFactory={createNewEmbeddableFromFactory}
      createNewEmbeddableFromAction={createNewEmbeddableFromAction}
      promotedVisTypes={([] as Array<BaseVisType<VisParams>>).concat(
        promotedVisTypes,
        legacyVisTypes
      )}
      factories={factories}
      addPanelActions={addPanelActions}
      visTypeAliases={visTypeAliases}
    />
  );
};
