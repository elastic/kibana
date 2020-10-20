/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface IndexPatternLinkReturnType {
  isIndexPattern: boolean;
  indexData: any;
  meta: any;
}
export interface JobDataLinkReturnType {
  isJob: boolean;
  jobData: any;
}
export interface TransformLinkReturnType {
  isTransform: boolean;
  transformData: any;
}
export type NextLinkReturnType =
  | IndexPatternLinkReturnType
  | JobDataLinkReturnType
  | TransformLinkReturnType
  | undefined;
export type MapElements = AnalyticsMapNodeElement | AnalyticsMapEdgeElement;
export interface AnalyticsMapReturnType {
  elements: MapElements[];
  details: object; // transform, job, or index details
  error: null | any;
}
export interface AnalyticsMapNodeElement {
  data: {
    id: string;
    label: string;
    type: string;
    analysisType?: string;
  };
}
export interface AnalyticsMapEdgeElement {
  data: {
    id: string;
    source: string;
    target: string;
  };
}
export const isAnalyticsMapNodeElement = (arg: any): arg is AnalyticsMapNodeElement => {
  if (typeof arg !== 'object' || arg === null) return false;
  const keys = Object.keys(arg);
  return keys.length > 0 && keys.includes('data') && arg.data.label !== undefined;
};
export const isAnalyticsMapEdgeElement = (arg: any): arg is AnalyticsMapEdgeElement => {
  if (typeof arg !== 'object' || arg === null) return false;
  const keys = Object.keys(arg);
  return keys.length > 0 && keys.includes('data') && arg.data.target !== undefined;
};
export const isIndexPatternLinkReturnType = (arg: any): arg is IndexPatternLinkReturnType => {
  if (typeof arg !== 'object' || arg === null) return false;
  const keys = Object.keys(arg);
  return keys.length > 0 && keys.includes('isIndexPattern');
};

export const isJobDataLinkReturnType = (arg: any): arg is JobDataLinkReturnType => {
  if (typeof arg !== 'object' || arg === null) return false;
  const keys = Object.keys(arg);
  return keys.length > 0 && keys.includes('isJob');
};

export const isTransformLinkReturnType = (arg: any): arg is TransformLinkReturnType => {
  if (typeof arg !== 'object' || arg === null) return false;
  const keys = Object.keys(arg);
  return keys.length > 0 && keys.includes('isTransform');
};
