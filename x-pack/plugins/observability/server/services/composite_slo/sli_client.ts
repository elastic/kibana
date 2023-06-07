/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CompositeSLO, Duration, IndicatorData } from '../../domain/models';
import { SLIClient } from '../slo';

type WindowName = string;

interface LookbackWindow {
  name: WindowName;
  duration: Duration;
}

export interface CompositeSLIClient {
  fetchSLIDataFrom(
    slo: CompositeSLO,
    lookbackWindows: LookbackWindow[]
  ): Promise<Record<WindowName, IndicatorData>>;
}

export class DefaultCompositeSLIClient implements CompositeSLIClient {
  constructor(private sliClient: SLIClient) {}

  async fetchSLIDataFrom(
    slo: CompositeSLO,
    lookbackWindows: LookbackWindow[]
  ): Promise<Record<WindowName, IndicatorData>> {
    const slosWithSliData = await Promise.all(
      slo.sources.map(async (source) => {
        if (!source.slo) {
          throw new Error(`Composite SLO [${slo.id}] missing source SLO for ${source.id}`);
        }
        const sliData = await this.sliClient.fetchSLIDataFrom(source.slo, lookbackWindows);
        return { ...source, sliData };
      })
    );

    const totalWeight = slo.sources.reduce((weight, source) => weight + source.weight, 0);

    return lookbackWindows.reduce((acc, lookbackWindow) => {
      const weightedSLI = slosWithSliData.reduce((accSli, sloWithData) => {
        return accSli + sloWithData.sliData[lookbackWindow.name].sli * sloWithData.weight;
      }, 0);
      const sli = weightedSLI / totalWeight;
      // Date range should be the same for each window
      const dateRange = slosWithSliData[0].sliData[lookbackWindow.name].dateRange;
      acc[lookbackWindow.name] = { dateRange, sli };
      return acc;
    }, {} as Record<WindowName, IndicatorData>);
  }
}
