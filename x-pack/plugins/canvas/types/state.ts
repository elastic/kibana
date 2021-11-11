/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaContext } from 'src/plugins/data/common';
import {
  AnyExpressionFunctionDefinition,
  Datatable,
  ExpressionValueFilter,
  ExpressionImage,
  PointSeries,
  Render,
  Style,
  Range,
} from 'src/plugins/expressions';
import { Datasource, Model, Transform, View } from '../public/expression_types';
import { AssetType } from './assets';
import { CanvasWorkpad, Sidebar } from './canvas';

export enum AppStateKeys {
  FULLSCREEN = '__fullscreen',
  REFRESH_INTERVAL = '__refreshInterval',
  AUTOPLAY_INTERVAL = '__autoplayInterval',
}

export interface AppState {
  [AppStateKeys.FULLSCREEN]?: boolean;
  [AppStateKeys.REFRESH_INTERVAL]?: string;
  [AppStateKeys.AUTOPLAY_INTERVAL]?: string;
}

interface StoreAppState {
  basePath: string;
  serverFunctions: AnyExpressionFunctionDefinition[];
  ready: boolean;
}

interface ElementStatsType {
  total: number;
  ready: number;
  pending: number;
  error: number;
}

type ExpressionType =
  | Datatable
  | ExpressionValueFilter
  | ExpressionImage
  | KibanaContext
  | PointSeries
  | Style
  | Range
  | View
  | Model
  | Datasource
  | Transform;

export interface ExpressionRenderable {
  state: 'ready' | 'pending';
  value: Render<ExpressionType> | null;
  error: null;
}

export interface ExpressionContext {
  state: 'ready' | 'pending' | 'error';
  value: ExpressionType;
  error: null | string;
}

export interface ResolvedArgType {
  expressionRenderable?: ExpressionRenderable;
  expressionContext: ExpressionContext;
}

export interface TransientState {
  canUserWrite: boolean;
  zoomScale: number;
  elementStats: ElementStatsType;
  fullScreen: boolean;
  selectedTopLevelNodes: string[];
  resolvedArgs: { [key: string]: ResolvedArgType | undefined };
  refresh: {
    interval: number;
  };
  autoplay: {
    enabled: boolean;
    interval: number;
  };
  inFlight: boolean;
  sidebar: Sidebar;
}

interface PersistentState {
  schemaVersion: number;
  workpad: CanvasWorkpad;
}

export interface State {
  app: StoreAppState;
  assets: { [assetKey: string]: AssetType };
  transient: TransientState;
  persistent: PersistentState;
}
