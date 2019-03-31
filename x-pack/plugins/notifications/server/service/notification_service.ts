/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from './action';

export interface INotificationService {
  setAction(action: Action): void;
  removeAction(id: string): Action | undefined;
  getActionForId(id: string): Action | undefined;
  getActionsForData(data: any): Action[];
}

/**
 * Notification Service represents a service that contains generic "actions", such as "Send to Email"
 * that are added at startup by plugins to enable notifications to be sent either by the user manually
 * or via the some scheduled / automated task.
 */
export class NotificationService implements INotificationService {
  private actions: Action[] = [];

  /**
   * Add a new action to the action service.
   *
   * @param {Action} action An implementation of Action.
   */
  public setAction(action: Action): void {
    this.removeAction(action.getId());

    this.actions.push(action);
  }

  /**
   * Remove an existing action from the action service.
   *
   * @param {String} id The ID of the action to remove.
   * @return {Action} The action that was removed, or undefined.
   */
  public removeAction(id: string): Action | undefined {
    const index = this.actions.findIndex(action => action.getId() === id);

    if (index !== -1) {
      const removedActions = this.actions.splice(index, 1);
      return removedActions[0];
    }

    return undefined;
  }

  /**
   * Get action with the specified {@code id}, if any.
   *
   * This is useful when you know that an action is provided, such as one provided by your own plugin,
   * and you want to use it to handle things in a consistent way.
   *
   * @param {String} id The ID of the Action.
   * @return {Action} The Action that matches the ID, or undefined.
   */
  public getActionForId(id: string): Action | undefined {
    return this.actions.find(action => action.getId() === id);
  }

  /**
   * Get actions that will accept the {@code data}.
   *
   * @param {Object} data The data object to pass to actions.
   * @return {Array} An array of Actions that can be used with the data, if any. Empty if none.
   */
  public getActionsForData(data: any = {}): Action[] {
    return this.actions.filter(action => {
      try {
        return action.getMissingFields(data).length === 0;
      } catch (err) {
        return false;
      }
    });
  }
}

/**
 * A singleton reference to the notification service intended to be used across Kibana.
 */
export const notificationService: INotificationService = new NotificationService();
