/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import memoizeOne from 'memoize-one';
import { isEqual } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/common';
import { IndexPatternTitle } from '../../../../../../common/types/kibana';
import { IndicesOptions } from '../../../../../../common/types/anomaly_detection_jobs';
import {
  Field,
  SplitField,
  AggFieldPair,
  RuntimeMappings,
} from '../../../../../../common/types/fields';
import { ml } from '../../../../services/ml_api_service';
import { mlResultsService } from '../../../../services/results_service';
import { getCategoryFields as getCategoryFieldsOrig } from './searches';
import { aggFieldPairsCanBeCharted } from '../job_creator/util/general';

type DetectorIndex = number;
export interface LineChartPoint {
  time: number | string;
  value: number;
}
type SplitFieldValue = string | null;
export type LineChartData = Record<DetectorIndex, LineChartPoint[]>;

const eq = (newArgs: any[], lastArgs: any[]) => isEqual(newArgs, lastArgs);

export class ChartLoader {
  private _indexPatternTitle: IndexPatternTitle = '';
  private _timeFieldName: string = '';
  private _query: object = {};

  private _newJobLineChart = memoizeOne(ml.jobs.newJobLineChart, eq);
  private _newJobPopulationsChart = memoizeOne(ml.jobs.newJobPopulationsChart, eq);
  private _getEventRateData = memoizeOne(mlResultsService.getEventRateData, eq);
  private _getCategoryFields = memoizeOne(getCategoryFieldsOrig, eq);

  constructor(indexPattern: DataView, query: object) {
    this._indexPatternTitle = indexPattern.title;
    this._query = query;

    if (typeof indexPattern.timeFieldName === 'string') {
      this._timeFieldName = indexPattern.timeFieldName;
    }
  }

  async loadLineCharts(
    start: number,
    end: number,
    aggFieldPairs: AggFieldPair[],
    splitField: SplitField,
    splitFieldValue: SplitFieldValue,
    intervalMs: number,
    runtimeMappings: RuntimeMappings | null,
    indicesOptions?: IndicesOptions
  ): Promise<LineChartData> {
    if (this._timeFieldName !== '') {
      if (aggFieldPairsCanBeCharted(aggFieldPairs) === false) {
        // no elasticsearch aggregation, this must contain ML only functions
        return {};
      }

      const splitFieldName = splitField !== null ? splitField.name : null;
      const aggFieldPairNames = aggFieldPairs.map(getAggFieldPairNames);

      const resp = await this._newJobLineChart(
        this._indexPatternTitle,
        this._timeFieldName,
        start,
        end,
        intervalMs,
        this._query,
        aggFieldPairNames,
        splitFieldName,
        splitFieldValue,
        runtimeMappings ?? undefined,
        indicesOptions
      );

      return resp.results;
    }
    return {};
  }

  async loadPopulationCharts(
    start: number,
    end: number,
    aggFieldPairs: AggFieldPair[],
    splitField: SplitField,
    intervalMs: number,
    runtimeMappings: RuntimeMappings | null,
    indicesOptions?: IndicesOptions
  ): Promise<LineChartData> {
    if (this._timeFieldName !== '') {
      if (aggFieldPairsCanBeCharted(aggFieldPairs) === false) {
        // no elasticsearch aggregation, this must contain ML only functions
        return {};
      }

      const splitFieldName = splitField !== null ? splitField.name : '';
      const aggFieldPairNames = aggFieldPairs.map(getAggFieldPairNames);

      const resp = await this._newJobPopulationsChart(
        this._indexPatternTitle,
        this._timeFieldName,
        start,
        end,
        intervalMs,
        this._query,
        aggFieldPairNames,
        splitFieldName,
        runtimeMappings ?? undefined,
        indicesOptions
      );

      return resp.results;
    }
    return {};
  }

  async loadEventRateChart(
    start: number,
    end: number,
    intervalMs: number,
    runtimeMappings?: RuntimeMappings,
    indicesOptions?: IndicesOptions
  ): Promise<LineChartPoint[]> {
    if (this._timeFieldName !== '') {
      const resp = await this._getEventRateData(
        this._indexPatternTitle,
        this._query,
        this._timeFieldName,
        start,
        end,
        intervalMs * 3,
        runtimeMappings,
        indicesOptions
      );
      if (resp.error !== undefined) {
        throw resp.error;
      }

      return Object.entries(resp.results).map(([time, value]) => ({
        time: +time,
        value: value as number,
      }));
    }
    return [];
  }

  async loadFieldExampleValues(
    field: Field,
    runtimeMappings: RuntimeMappings | null,
    indicesOptions?: IndicesOptions
  ): Promise<string[]> {
    const { results } = await this._getCategoryFields(
      this._indexPatternTitle,
      field.name,
      10,
      this._query,
      runtimeMappings ?? undefined,
      indicesOptions
    );
    return results;
  }
}

export function getAggFieldPairNames(af: AggFieldPair) {
  const by =
    af.by !== undefined && af.by.field !== null && af.by.value !== null
      ? { field: af.by.field.id, value: af.by.value }
      : { field: null, value: null };

  return {
    agg: af.agg.dslName || '',
    field: af.field.id,
    by,
  };
}
