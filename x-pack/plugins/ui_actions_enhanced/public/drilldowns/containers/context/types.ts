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
  BaseActionConfig,
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
  /**
   * Keeps track of the current view to display to the user.
   */
  currentTab: 'create' | 'edit' | 'list';

  /**
   * Whether a drilldowns welcome message should be displayed to the user at
   * the very top of the drilldowns manager flyout.
   */
  showWelcomeMessage: boolean;

  /**
   * Callback called to hide drilldowns welcome message, and remember in local
   * storage that user opted to hide this message.
   */
  hideWelcomeMessage: () => void;

  /**
   * Name of the drilldown which is being currently created.
   */
  drilldownName: string;

  /**
   * Change the name of the currently created drilldown.
   */
  setDrilldownName: (name: string) => void;

  /**
   * Currently selected action factory (drilldown type).
   */
  actionFactory: undefined | ActionFactory;

  /**
   * Select a different action factory.
   */
  setActionFactory: (actionFactory: undefined | ActionFactory) => void;

  /**
   * Current action factory configuration, i.e. drilldown configuration object,
   * which is serializable and persisted in storage.
   */
  actionConfig: undefined | BaseActionConfig;

  /**
   * Update the current drilldown configuration.
   */
  setActionConfig: (actionConfig: undefined | BaseActionConfig) => void;

  /**
   * Currently selected triggers, normally a single trigger selected by the user,
   * in case multiple triggers are possible for location/drilldown combination.
   */
  selectedTriggers: undefined | string[];

  /**
   * Set currently selected triggers.
   */
  setSelectedTriggers: (triggers: undefined | string[]) => void;
}
