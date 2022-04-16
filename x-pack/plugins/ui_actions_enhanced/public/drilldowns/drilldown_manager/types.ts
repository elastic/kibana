/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToastsStart } from '@kbn/core/public';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { Trigger } from '@kbn/ui-actions-plugin/public';
import {
  ActionFactory,
  BaseActionFactoryContext,
  DynamicActionManager,
} from '../../dynamic_actions';

/**
 * Interface used as piece of ActionFactoryContext that is passed in from
 * drilldown wizard component to action factories. Omitted values are added
 * inside the wizard and then full {@link BaseActionFactoryContext} passed into
 * action factory methods
 */
export type ActionFactoryPlaceContext<
  ActionFactoryContext extends BaseActionFactoryContext = BaseActionFactoryContext
> = Omit<ActionFactoryContext, 'triggers'>;

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
   * Initial screen which Drilldown Manager should display when it first opens.
   * Afterwards the state of the currently visible screen is controlled by the
   * Drilldown Manager.
   *
   * Possible values of the route:
   *
   * - `/create` --- opens with "Create new" tab selected.
   * - `/new` --- opens with the "Create new" tab selected showing new drilldown form.
   * - `/manage` --- opens with selected "Manage" tab.
   * - `/manage/yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy` --- opens in edit mode where
   *   drilldown with ID `yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy` is being edited.
   */
  initialRoute?: string;

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

  /**
   * List of drilldown templates, which will be displayed to user for fast
   * drilldown creation flow.
   */
  templates?: DrilldownTemplate[];

  /**
   * Whether to close the drilldown flyout after a drilldown was created
   */
  closeAfterCreate?: boolean;
}

/**
 * Template for a pre-configured new drilldown, this gives ability to create a
 * drilldown from a template instead of user creating a drilldown from scratch.
 * This is used in "drilldown cloning" functionality, where drilldowns can be
 * cloned from one dashboard panel to another.
 */
export interface DrilldownTemplate {
  /**
   * A string that uniquely identifies this item in a list of `DrilldownTemplate[]`.
   */
  id: string;

  /**
   * EUI icon display next to the description.
   */
  icon?: string;

  /**
   * A user facing text that provides information about the source of this template.
   */
  description: string;

  /**
   * Drilldown type, dynamic action factory ID.
   */
  factoryId: string;

  /**
   * Suggested new name of the cloned drilldown. If a drilldown with such suggested
   * name already exists at current place, a suffix like " (copy 1)" will be added.
   */
  name: string;

  /**
   * Pre-selected triggers.
   */
  triggers: string[];

  /**
   * Preliminary configuration of the new drilldown, to be used in the dynamicaction factory.
   */
  config: unknown;
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
