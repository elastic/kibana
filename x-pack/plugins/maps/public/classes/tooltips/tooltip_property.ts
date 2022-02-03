/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { ReactNode } from 'react';
import { GeoJsonProperties, Geometry } from 'geojson';
import { Filter } from '@kbn/es-query';
import { ActionExecutionContext, Action } from 'src/plugins/ui_actions/public';
import { RawValue } from '../../../../../plugins/maps/common/constants';
import type { TooltipFeature } from '../../../../../plugins/maps/common/descriptor_types';

export interface ITooltipProperty {
  getPropertyKey(): string;
  getPropertyName(): string | ReactNode;
  getHtmlDisplayValue(): string;
  getRawValue(): string | string[] | undefined;
  isFilterable(): boolean;
  getESFilters(): Promise<Filter[]>;
}

export interface LoadFeatureProps {
  layerId: string;
  featureId?: number | string;
}

export interface FeatureGeometry {
  coordinates: [number];
  type: string;
}

export interface RenderTooltipContentParams {
  addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
  closeTooltip: () => void;
  features: TooltipFeature[];
  getActionContext?: () => ActionExecutionContext;
  getFilterActions?: () => Promise<Action[]>;
  getLayerName: (layerId: string) => Promise<string | null>;
  isLocked: boolean;

  /*
   * Uses feature's layer to extend, filter, and format feature properties into tooltip properties.
   * @param {string} layerId Use features[featureIndex].layerId
   * @param {GeoJsonProperties} properties Use features[featureIndex].mbProperties or pass in a custom properties object
   */
  loadFeatureProperties: ({
    layerId,
    properties,
  }: {
    layerId: string;
    properties: GeoJsonProperties;
  }) => Promise<ITooltipProperty[]>;
  loadFeatureGeometry: ({
    layerId,
    featureId,
  }: {
    layerId: string;
    featureId?: string | number;
  }) => Geometry | null;
  onSingleValueTrigger?: (actionId: string, key: string, value: RawValue) => void;
}

export type RenderToolTipContent = (params: RenderTooltipContentParams) => JSX.Element;

export class TooltipProperty implements ITooltipProperty {
  private readonly _propertyKey: string;
  private readonly _rawValue: string | string[] | undefined;
  private readonly _propertyName: string;

  constructor(propertyKey: string, propertyName: string, rawValue: string | string[] | undefined) {
    this._propertyKey = propertyKey;
    this._propertyName = propertyName;
    this._rawValue = rawValue;
  }

  getPropertyKey(): string {
    return this._propertyKey;
  }

  getPropertyName(): string {
    return this._propertyName;
  }

  getHtmlDisplayValue(): string {
    return _.escape(Array.isArray(this._rawValue) ? this._rawValue.join() : this._rawValue);
  }

  getRawValue(): string | string[] | undefined {
    return this._rawValue;
  }

  isFilterable(): boolean {
    return false;
  }

  async getESFilters(): Promise<Filter[]> {
    return [];
  }
}
