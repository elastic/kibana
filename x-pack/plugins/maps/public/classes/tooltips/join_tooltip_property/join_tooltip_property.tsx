/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { Filter } from '@kbn/es-query';
import { ITooltipProperty } from '../tooltip_property';
import { InnerJoin } from '../../joins/inner_join';
import { JoinKeyLabel } from './join_key_label';

export class JoinTooltipProperty implements ITooltipProperty {
  private readonly _tooltipProperty: ITooltipProperty;
  private readonly _innerJoins: InnerJoin[];

  constructor(tooltipProperty: ITooltipProperty, innerJoins: InnerJoin[]) {
    this._tooltipProperty = tooltipProperty;
    this._innerJoins = innerJoins;
  }

  isFilterable(): boolean {
    return true;
  }

  getPropertyKey(): string {
    return this._tooltipProperty.getPropertyKey();
  }

  getPropertyName(): ReactNode {
    return (
      <JoinKeyLabel
        leftFieldName={this._tooltipProperty.getPropertyName() as string}
        innerJoins={this._innerJoins}
      />
    );
  }

  getRawValue(): string | string[] | undefined {
    return this._tooltipProperty.getRawValue();
  }

  getHtmlDisplayValue(): ReactNode {
    return this._tooltipProperty.getHtmlDisplayValue();
  }

  async getESFilters(): Promise<Filter[]> {
    const esFilters = [];

    // only create filters for right sources.
    // do not create filters for left source.
    for (let i = 0; i < this._innerJoins.length; i++) {
      const rightSource = this._innerJoins[i].getRightJoinSource();
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
