/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToastsStart } from 'kibana/public';
import { IStorageWrapper } from '../../../../../../../src/plugins/kibana_utils/public';
import { Trigger } from '../../../../../../../src/plugins/ui_actions/public';
import {
  ActionFactory,
  BaseActionFactoryContext,
  DynamicActionManager,
} from '../../../dynamic_actions';
import { ActionFactoryPlaceContext } from '../../components/types';

/**
 * This are props of the public <DrilldownManager> React component which is
 * exposed from this plugin's contract, user can change these props every time
 * the public <DrilldownManager> is re-rendered.
 */
export interface PublicDrilldownManagerProps {
  /**
   * Implementation of reactive storage interface for drilldowns. Dynamic action
   * manager is responsible for permanently persisting drilldowns, i.e.
   * drilldown name, type, and config. It exposes observables for reactive UI
   * updates.
   */
  dynamicActionManager: DynamicActionManager;

  /**
   * The state of the top level tab of drilldowns flyout.
   */
  tab: 'create' | 'manage';

  /**
   * Callback called when drilldown flyout should be closed.
   */
  onClose: () => void;

  /**
   * List of possible triggers in current context
   */
  triggers: string[];

  /**
   * Extra action factory context passed into action factories CollectConfig, getIconType, getDisplayName and etc...
   */
  placeContext?: ActionFactoryPlaceContext<BaseActionFactoryContext>;
}

/**
 * These are static global dependencies of the <DrilldownManager> wired in
 * during the setup life-cycle of the plugin.
 */
export interface DrilldownManagerDependencies {
  /**
   * List of registered UI Actions action factories, i.e. drilldowns.
   */
  actionFactories: ActionFactory[];

  /**
   * Trigger getter from UI Actions trigger registry.
   */
  getTrigger: (triggerId: string) => Trigger;

  /**
   * Implementation of local storage interface for persisting user preferences,
   * e.g. user can dismiss the welcome message.
   */
  storage: IStorageWrapper;

  /**
   * Services for displaying user toast notifications.
   */
  toastService: ToastsStart;

  /**
   * Link to drilldowns user facing docs on corporate website.
   */
  docsLink?: string;

  /**
   * Link to trigger picker user facing docs on corporate website.
   */
  triggerPickerDocsLink?: string;
}

/**
 * This the value of React context available to the drilldown manager flyout and
 * all its child components.
 */
export interface DrilldownManagerContextValue
  extends PublicDrilldownManagerProps,
    DrilldownManagerDependencies {
  drilldownName: string;
}
