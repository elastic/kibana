/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from '../vector_source';
import { IVectorSource } from '../vector_source';
import { TimeRange } from '../../../../../../../src/plugins/data/common';
import { IndexPattern, ISearchSource } from '../../../../../../../src/plugins/data/public';
import {
  DynamicStylePropertyOptions,
  MapQuery,
  VectorSourceRequestMeta,
} from '../../../../common/descriptor_types';
import { IVectorStyle } from '../../styles/vector/vector_style';
import { IDynamicStyleProperty } from '../../styles/vector/properties/dynamic_style_property';

export interface IESSource extends IVectorSource {
  getId(): string;
  getIndexPattern(): Promise<IndexPattern>;
  getIndexPatternId(): string;
  getGeoFieldName(): string;
  getMaxResultWindow(): Promise<number>;
  makeSearchSource(
    searchFilters: VectorSourceRequestMeta,
    limit: number,
    initialSearchContext?: object
  ): Promise<ISearchSource>;
  loadStylePropsMeta({
    layerName,
    style,
    dynamicStyleProps,
    registerCancelCallback,
    sourceQuery,
    timeFilters,
  }: {
    layerName: string;
    style: IVectorStyle;
    dynamicStyleProps: Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
    registerCancelCallback: (callback: () => void) => void;
    sourceQuery?: MapQuery;
    timeFilters: TimeRange;
  }): Promise<object>;
}

export class AbstractESSource extends AbstractVectorSource implements IESSource {
  getId(): string;
  getIndexPattern(): Promise<IndexPattern>;
  getIndexPatternId(): string;
  getGeoFieldName(): string;
  getMaxResultWindow(): Promise<number>;
  makeSearchSource(
    searchFilters: VectorSourceRequestMeta,
    limit: number,
    initialSearchContext?: object
  ): Promise<ISearchSource>;
  loadStylePropsMeta({
    layerName,
    style,
    dynamicStyleProps,
    registerCancelCallback,
    sourceQuery,
    timeFilters,
  }: {
    layerName: string;
    style: IVectorStyle;
    dynamicStyleProps: Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
    registerCancelCallback: (callback: () => void) => void;
    sourceQuery?: MapQuery;
    timeFilters: TimeRange;
  }): Promise<object>;
  _runEsQuery: ({
    requestId,
    requestName,
    requestDescription,
    searchSource,
    registerCancelCallback,
  }: {
    requestId: string;
    requestName: string;
    requestDescription: string;
    searchSource: ISearchSource;
    registerCancelCallback: () => void;
  }) => Promise<unknown>;
}
