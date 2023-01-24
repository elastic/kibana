/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AllowlistFields } from './types';
import type { TelemetryEvent } from '../types';
import { endpointAllowlistFields } from './endpoint_alerts';
import { exceptionListAllowlistFields } from './exception_lists';
import { prebuiltRuleAllowlistFields } from './prebuilt_rules_alerts';

/**
 * Filters out Key/Values not required for downstream analysis
 * @returns TelemetryEvent with explicitly required fields
 */
export function copyAllowlistedFields(
  allowlist: AllowlistFields,
  event: TelemetryEvent
): TelemetryEvent {
  return Object.entries(allowlist).reduce<TelemetryEvent>((newEvent, [allowKey, allowValue]) => {
    const eventValue = event[allowKey];
    if (eventValue !== null && eventValue !== undefined) {
      if (allowValue === true) {
        return { ...newEvent, [allowKey]: eventValue };
      } else if (typeof allowValue === 'object' && Array.isArray(eventValue)) {
        const subValues = eventValue.filter((v) => typeof v === 'object');
        return {
          ...newEvent,
          [allowKey]: subValues.map((v) => copyAllowlistedFields(allowValue, v as TelemetryEvent)),
        };
      } else if (typeof allowValue === 'object' && typeof eventValue === 'object') {
        const values = copyAllowlistedFields(allowValue, eventValue as TelemetryEvent);
        return {
          ...newEvent,
          ...(Object.keys(values).length > 0 ? { [allowKey]: values } : {}),
        };
      }
    }
    return newEvent;
  }, {});
}

export class FilterList {
  private _endpointAlerts = endpointAllowlistFields;
  private _exceptionLists = exceptionListAllowlistFields;
  private _prebuiltRulesAlerts = prebuiltRuleAllowlistFields;

  public get endpointAlerts(): AllowlistFields {
    return this._endpointAlerts;
  }

  public set endpointAlerts(list: AllowlistFields) {
    this._endpointAlerts = list;
  }

  public get exceptionLists(): AllowlistFields {
    return this._exceptionLists;
  }

  public set exceptionLists(list: AllowlistFields) {
    this._exceptionLists = list;
  }

  public get prebuiltRulesAlerts(): AllowlistFields {
    return this._prebuiltRulesAlerts;
  }

  public set prebuiltRulesAlerts(list: AllowlistFields) {
    this._prebuiltRulesAlerts = list;
  }

  public resetAllToDefault() {
    this._endpointAlerts = endpointAllowlistFields;
    this._exceptionLists = exceptionListAllowlistFields;
    this._prebuiltRulesAlerts = prebuiltRuleAllowlistFields;
  }
}

export const filterList = new FilterList();
