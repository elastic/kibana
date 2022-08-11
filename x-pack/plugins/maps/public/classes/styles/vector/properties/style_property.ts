/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { ReactElement } from 'react';
// @ts-ignore
import { getVectorStyleLabel } from '../components/get_vector_style_label';
import { RawValue, VECTOR_STYLES } from '../../../../../common/constants';

export type LegendProps = {
  isPointsOnly: boolean;
  isLinesOnly: boolean;
  symbolId?: string;
  svg?: string;
};

export interface IStyleProperty<T> {
  isDynamic(): boolean;
  isComplete(): boolean;
  formatField(value: RawValue): string | number;
  getStyleName(): VECTOR_STYLES;
  getOptions(): T;
  renderLegendDetailRow(legendProps: LegendProps): ReactElement<any> | null;
  renderDataMappingPopover(
    onChange: (updatedOptions: Partial<T>) => void
  ): ReactElement<any> | null;
  getDisplayStyleName(): string;
}

export class AbstractStyleProperty<T> implements IStyleProperty<T> {
  protected readonly _options: T;
  protected readonly _styleName: VECTOR_STYLES;

  constructor(options: T, styleName: VECTOR_STYLES) {
    this._options = options;
    this._styleName = styleName;
  }

  isDynamic(): boolean {
    return false;
  }

  /**
   * Is the style fully defined and usable? (e.g. for rendering, in legend UX, ...)
   * Why? during editing, partially-completed descriptors may be added to the layer-descriptor
   * e.g. dynamic-fields can have an incomplete state when the field is not yet selected from the drop-down
   * @returns {boolean}
   */
  isComplete(): boolean {
    return true;
  }

  formatField(value: RawValue): string | number {
    if (typeof value === 'undefined' || value === null) {
      return '';
    } else if (typeof value === 'boolean') {
      return value.toString();
    } else if (Array.isArray(value)) {
      return value.join(', ');
    } else {
      return value;
    }
  }

  getStyleName(): VECTOR_STYLES {
    return this._styleName;
  }

  getOptions(): T {
    return this._options;
  }

  renderLegendDetailRow({ isPointsOnly, isLinesOnly }: LegendProps): ReactElement<any> | null {
    return null;
  }

  renderDataMappingPopover(
    onChange: (updatedOptions: Partial<T>) => void
  ): ReactElement<any> | null {
    return null;
  }

  getDisplayStyleName() {
    return getVectorStyleLabel(this.getStyleName());
  }
}
