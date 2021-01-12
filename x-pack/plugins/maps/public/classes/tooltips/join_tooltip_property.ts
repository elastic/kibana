/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ITooltipProperty } from './tooltip_property';
import { InnerJoin } from '../joins/inner_join';
import { Filter } from '../../../../../../src/plugins/data/public';

export class JoinTooltipProperty implements ITooltipProperty {
  private readonly _tooltipProperty: ITooltipProperty;
  private readonly _leftInnerJoins: InnerJoin[];

  constructor(tooltipProperty: ITooltipProperty, leftInnerJoins: InnerJoin[]) {
    this._tooltipProperty = tooltipProperty;
    this._leftInnerJoins = leftInnerJoins;
  }

  isFilterable(): boolean {
    return true;
  }

  getPropertyKey(): string {
    return this._tooltipProperty.getPropertyKey();
  }

  getPropertyName(): string {
    return this._tooltipProperty.getPropertyName();
  }

  getRawValue(): string | string[] | undefined {
    return this._tooltipProperty.getRawValue();
  }

  getHtmlDisplayValue(): string {
    return this._tooltipProperty.getHtmlDisplayValue();
  }

  async getESFilters(): Promise<Filter[]> {
    const esFilters = [];
    if (this._tooltipProperty.isFilterable()) {
      const filters = await this._tooltipProperty.getESFilters();
      esFilters.push(...filters);
    }

    for (let i = 0; i < this._leftInnerJoins.length; i++) {
      const rightSource = this._leftInnerJoins[i].getRightJoinSource();
      const termField = rightSource.getTermField();
      try {
        const esTooltipProperty = await termField.createTooltipProperty(
          this._tooltipProperty.getRawValue()
        );
        if (esTooltipProperty) {
          const filters = await esTooltipProperty.getESFilters();
          esFilters.push(...filters);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Cannot create joined filter', e);
      }
    }

    return esFilters;
  }
}
