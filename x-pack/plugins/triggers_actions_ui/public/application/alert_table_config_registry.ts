/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { noop } from 'lodash';
import { ALERT_TABLE_GENERIC_CONFIG_ID } from './constants';
import {
  AlertsTableConfigurationRegistry,
  AlertsTableConfigurationRegistryWithActions,
} from '../types';

export class AlertTableConfigRegistry {
  private readonly objectTypes: Map<
    string,
    AlertsTableConfigurationRegistry | AlertsTableConfigurationRegistryWithActions
  > = new Map();

  /**
   * Returns if the object type registry has the given type registered
   */
  public has(id: string) {
    return this.objectTypes.has(id);
  }

  /**
   * Registers an object type to the type registry
   */
  public register(objectType: AlertsTableConfigurationRegistry) {
    if (this.has(objectType.id)) {
      throw new Error(
        i18n.translate(
          'xpack.triggersActionsUI.typeRegistry.register.duplicateObjectTypeErrorMessage',
          {
            defaultMessage: 'Object type "{id}" is already registered.',
            values: {
              id: objectType.id,
            },
          }
        )
      );
    }
    this.objectTypes.set(objectType.id, objectType);
  }

  /**
   * Returns an object type, throw error if not registered
   */
  public get(id: string) {
    if (!this.has(id)) {
      throw new Error(
        i18n.translate('xpack.triggersActionsUI.typeRegistry.get.missingActionTypeErrorMessage', {
          defaultMessage: 'Object type "{id}" is not registered.',
          values: {
            id,
          },
        })
      );
    }
    return this.objectTypes.get(id)!;
  }

  public getActions(id: string): AlertsTableConfigurationRegistryWithActions['actions'] {
    return (
      (this.objectTypes.get(id) as AlertsTableConfigurationRegistryWithActions)?.actions ?? {
        toggleColumn: noop,
      }
    );
  }

  public list() {
    return Array.from(this.objectTypes).map(([id, objectType]) => objectType);
  }

  /**
   * Returns an object type, throw error if not registered
   */
  public update(id: string, objectType: AlertsTableConfigurationRegistryWithActions) {
    if (!this.has(id)) {
      throw new Error(
        i18n.translate('xpack.triggersActionsUI.typeRegistry.get.missingActionTypeErrorMessage', {
          defaultMessage: 'Object type "{id}" is not registered.',
          values: {
            id,
          },
        })
      );
    }
    this.objectTypes.set(id, objectType);
    return this.objectTypes.get(id)!;
  }

  public getAlertConfigIdPerRuleTypes(ruleTypeIds: string[]): string {
    const alertConfigs: string[] = [];
    Array.from(this.objectTypes).forEach(([id, objectType]) => {
      if (ruleTypeIds.every((ruleTypeId) => objectType.ruleTypeIds?.includes(ruleTypeId))) {
        alertConfigs.push(id);
      }
    });
    if (alertConfigs.length === 1) {
      return alertConfigs[0];
    }
    // If there is more than one, we will return the generic alert configuration id
    return ALERT_TABLE_GENERIC_CONFIG_ID;
  }
}
