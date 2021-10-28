/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { ITooltipProperty } from './tooltip_property';
import { InnerJoin } from '../joins/inner_join';
import { Filter } from '../../../../../../src/plugins/data/public';

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
    const content = i18n.translate('xpack.maps.tooltip.joinPropertyTooltipContent', {
      defaultMessage: `Shared key '{leftFieldName}' is joined with {rightSources}`,
      values: {
        leftFieldName: this._tooltipProperty.getPropertyName() as string,
        rightSources: this._innerJoins
          .map((innerJoin) => {
            const rightSource = innerJoin.getRightJoinSource();
            const termField = rightSource.getTermField();
            return `'${termField.getName()}'`;
          })
          .join(','),
      },
    });
    return (
      <>
        {this._tooltipProperty.getPropertyName()}
        <EuiToolTip position="bottom" content={content}>
          <EuiIcon type="link" />
        </EuiToolTip>
      </>
    );
  }

  getRawValue(): string | string[] | undefined {
    return this._tooltipProperty.getRawValue();
  }

  getHtmlDisplayValue(): string {
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
