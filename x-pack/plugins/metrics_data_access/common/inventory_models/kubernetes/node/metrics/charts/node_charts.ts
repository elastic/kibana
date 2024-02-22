/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LensConfigWithId } from '../../../../types';
import { formulas } from '../formulas';

export const nodeCharts = {
  xy: {
    nodeCpuCapacity: {
      id: 'nodeCpuCapacity',
      chartType: 'xy',
      title: 'Node CPU Capacity',
      layers: [
        {
          seriesType: 'area',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [formulas.nodeCpuCapacity, formulas.nodeCpuUsed],
        },
      ],
      fittingFunction: 'Linear',
      legend: {
        show: true,
        position: 'bottom',
      },
      axisTitleVisibility: {
        showXAxisTitle: false,
        showYAxisTitle: false,
      },
    } as LensConfigWithId,
    nodeMemoryCapacity: {
      id: 'nodeMemoryCapacity',
      chartType: 'xy',
      title: 'Node Memory Capacity',
      layers: [
        {
          seriesType: 'area',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [formulas.nodeMemoryCapacity, formulas.nodeMemoryUsed],
        },
      ],
      fittingFunction: 'Linear',
      legend: {
        show: true,
        position: 'bottom',
      },
      axisTitleVisibility: {
        showXAxisTitle: false,
        showYAxisTitle: false,
      },
    } as LensConfigWithId,
    nodeDiskCapacity: {
      id: 'nodeDiskCapacity',
      chartType: 'xy',
      title: 'Node Disk Capacity',
      layers: [
        {
          seriesType: 'area',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [formulas.nodeDiskCapacity, formulas.nodeDiskUsed],
        },
      ],
      fittingFunction: 'Linear',
      legend: {
        show: true,
        position: 'bottom',
      },
      axisTitleVisibility: {
        showXAxisTitle: false,
        showYAxisTitle: false,
      },
    } as LensConfigWithId,
    nodePodCapacity: {
      id: 'nodePodCapacity',
      chartType: 'xy',
      title: 'Node Pod Capacity',
      layers: [
        {
          seriesType: 'area',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [formulas.nodePodCapacity, formulas.nodePodUsed],
        },
      ],
      fittingFunction: 'Linear',
      legend: {
        show: true,
        position: 'bottom',
      },
      axisTitleVisibility: {
        showXAxisTitle: false,
        showYAxisTitle: false,
      },
    } as LensConfigWithId,
  },
} as const;
