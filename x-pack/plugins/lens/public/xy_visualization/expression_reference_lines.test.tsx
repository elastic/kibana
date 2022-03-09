/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LineAnnotation, RectAnnotation } from '@elastic/charts';
import { shallow } from 'enzyme';
import React from 'react';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import { FieldFormat } from 'src/plugins/field_formats/common';
import { LensMultiTable } from '../../common';
import { ReferenceLineLayerArgs, YConfig } from '../../common/expressions';
import {
  ReferenceLineAnnotations,
  ReferenceLineAnnotationsProps,
} from './expression_reference_lines';

const paletteService = chartPluginMock.createPaletteRegistry();

const row: Record<string, number> = {
  xAccessorFirstId: 1,
  xAccessorSecondId: 2,
  yAccessorLeftFirstId: 5,
  yAccessorLeftSecondId: 10,
  yAccessorRightFirstId: 5,
  yAccessorRightSecondId: 10,
};

const histogramData: LensMultiTable = {
  type: 'lens_multitable',
  tables: {
    firstLayer: {
      type: 'datatable',
      rows: [row],
      columns: Object.keys(row).map((id) => ({
        id,
        name: `Static value: ${row[id]}`,
        meta: {
          type: 'number',
          params: { id: 'number' },
        },
      })),
    },
  },
  dateRange: {
    fromDate: new Date('2020-04-01T16:14:16.246Z'),
    toDate: new Date('2020-04-01T17:15:41.263Z'),
  },
};

function createLayers(yConfigs: ReferenceLineLayerArgs['yConfig']): ReferenceLineLayerArgs[] {
  return [
    {
      layerId: 'firstLayer',
      layerType: 'referenceLine',
      accessors: (yConfigs || []).map(({ forAccessor }) => forAccessor),
      yConfig: yConfigs,
    },
  ];
}

interface YCoords {
  y0: number | undefined;
  y1: number | undefined;
}
interface XCoords {
  x0: number | undefined;
  x1: number | undefined;
}

function getAxisFromId(layerPrefix: string): YConfig['axisMode'] {
  return /left/i.test(layerPrefix) ? 'left' : /right/i.test(layerPrefix) ? 'right' : 'bottom';
}

const emptyCoords = { x0: undefined, x1: undefined, y0: undefined, y1: undefined };

describe('ReferenceLineAnnotations', () => {
  describe('with fill', () => {
    let formatters: Record<'left' | 'right' | 'bottom', FieldFormat | undefined>;
    let defaultProps: Omit<ReferenceLineAnnotationsProps, 'data' | 'layers'>;

    beforeEach(() => {
      formatters = {
        left: { convert: jest.fn((x) => x) } as unknown as FieldFormat,
        right: { convert: jest.fn((x) => x) } as unknown as FieldFormat,
        bottom: { convert: jest.fn((x) => x) } as unknown as FieldFormat,
      };

      defaultProps = {
        formatters,
        paletteService,
        syncColors: false,
        isHorizontal: false,
        axesMap: { left: true, right: false },
        paddingMap: {},
      };
    });

    it.each([
      ['yAccessorLeft', 'above'],
      ['yAccessorLeft', 'below'],
      ['yAccessorRight', 'above'],
      ['yAccessorRight', 'below'],
    ] as Array<[string, YConfig['fill']]>)(
      'should render a RectAnnotation for a reference line with fill set: %s %s',
      (layerPrefix, fill) => {
        const axisMode = getAxisFromId(layerPrefix);
        const wrapper = shallow(
          <ReferenceLineAnnotations
            {...defaultProps}
            data={histogramData}
            layers={createLayers([
              {
                forAccessor: `${layerPrefix}FirstId`,
                axisMode,
                lineStyle: 'solid',
                fill,
              },
            ])}
          />
        );

        const y0 = fill === 'above' ? 5 : undefined;
        const y1 = fill === 'above' ? undefined : 5;

        expect(wrapper.find(LineAnnotation).exists()).toBe(true);
        expect(wrapper.find(RectAnnotation).exists()).toBe(true);
        expect(wrapper.find(RectAnnotation).prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { x0: undefined, x1: undefined, y0, y1 },
              details: y0 ?? y1,
              header: undefined,
            },
          ])
        );
      }
    );

    it.each([
      ['xAccessor', 'above'],
      ['xAccessor', 'below'],
    ] as Array<[string, YConfig['fill']]>)(
      'should render a RectAnnotation for a reference line with fill set: %s %s',
      (layerPrefix, fill) => {
        const wrapper = shallow(
          <ReferenceLineAnnotations
            {...defaultProps}
            data={histogramData}
            layers={createLayers([
              {
                forAccessor: `${layerPrefix}FirstId`,
                axisMode: 'bottom',
                lineStyle: 'solid',
                fill,
              },
            ])}
          />
        );

        const x0 = fill === 'above' ? 1 : undefined;
        const x1 = fill === 'above' ? undefined : 1;

        expect(wrapper.find(LineAnnotation).exists()).toBe(true);
        expect(wrapper.find(RectAnnotation).exists()).toBe(true);
        expect(wrapper.find(RectAnnotation).prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, x0, x1 },
              details: x0 ?? x1,
              header: undefined,
            },
          ])
        );
      }
    );

    it.each([
      ['yAccessorLeft', 'above', { y0: 5, y1: 10 }, { y0: 10, y1: undefined }],
      ['yAccessorLeft', 'below', { y0: undefined, y1: 5 }, { y0: 5, y1: 10 }],
      ['yAccessorRight', 'above', { y0: 5, y1: 10 }, { y0: 10, y1: undefined }],
      ['yAccessorRight', 'below', { y0: undefined, y1: 5 }, { y0: 5, y1: 10 }],
    ] as Array<[string, YConfig['fill'], YCoords, YCoords]>)(
      'should avoid overlap between two reference lines with fill in the same direction: 2 x %s %s',
      (layerPrefix, fill, coordsA, coordsB) => {
        const axisMode = getAxisFromId(layerPrefix);
        const wrapper = shallow(
          <ReferenceLineAnnotations
            {...defaultProps}
            data={histogramData}
            layers={createLayers([
              {
                forAccessor: `${layerPrefix}FirstId`,
                axisMode,
                lineStyle: 'solid',
                fill,
              },
              {
                forAccessor: `${layerPrefix}SecondId`,
                axisMode,
                lineStyle: 'solid',
                fill,
              },
            ])}
          />
        );

        expect(wrapper.find(RectAnnotation).first().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...coordsA },
              details: coordsA.y0 ?? coordsA.y1,
              header: undefined,
            },
          ])
        );
        expect(wrapper.find(RectAnnotation).last().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...coordsB },
              details: coordsB.y1 ?? coordsB.y0,
              header: undefined,
            },
          ])
        );
      }
    );

    it.each([
      ['xAccessor', 'above', { x0: 1, x1: 2 }, { x0: 2, x1: undefined }],
      ['xAccessor', 'below', { x0: undefined, x1: 1 }, { x0: 1, x1: 2 }],
    ] as Array<[string, YConfig['fill'], XCoords, XCoords]>)(
      'should avoid overlap between two reference lines with fill in the same direction: 2 x %s %s',
      (layerPrefix, fill, coordsA, coordsB) => {
        const wrapper = shallow(
          <ReferenceLineAnnotations
            {...defaultProps}
            data={histogramData}
            layers={createLayers([
              {
                forAccessor: `${layerPrefix}FirstId`,
                axisMode: 'bottom',
                lineStyle: 'solid',
                fill,
              },
              {
                forAccessor: `${layerPrefix}SecondId`,
                axisMode: 'bottom',
                lineStyle: 'solid',
                fill,
              },
            ])}
          />
        );

        expect(wrapper.find(RectAnnotation).first().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...coordsA },
              details: coordsA.x0 ?? coordsA.x1,
              header: undefined,
            },
          ])
        );
        expect(wrapper.find(RectAnnotation).last().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...coordsB },
              details: coordsB.x1 ?? coordsB.x0,
              header: undefined,
            },
          ])
        );
      }
    );

    it.each(['yAccessorLeft', 'yAccessorRight', 'xAccessor'])(
      'should let areas in different directions overlap: %s',
      (layerPrefix) => {
        const axisMode = getAxisFromId(layerPrefix);

        const wrapper = shallow(
          <ReferenceLineAnnotations
            {...defaultProps}
            data={histogramData}
            layers={createLayers([
              {
                forAccessor: `${layerPrefix}FirstId`,
                axisMode,
                lineStyle: 'solid',
                fill: 'above',
              },
              {
                forAccessor: `${layerPrefix}SecondId`,
                axisMode,
                lineStyle: 'solid',
                fill: 'below',
              },
            ])}
          />
        );

        expect(wrapper.find(RectAnnotation).first().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...(axisMode === 'bottom' ? { x0: 1 } : { y0: 5 }) },
              details: axisMode === 'bottom' ? 1 : 5,
              header: undefined,
            },
          ])
        );
        expect(wrapper.find(RectAnnotation).last().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...(axisMode === 'bottom' ? { x1: 2 } : { y1: 10 }) },
              details: axisMode === 'bottom' ? 2 : 10,
              header: undefined,
            },
          ])
        );
      }
    );

    it.each([
      ['above', { y0: 5, y1: 10 }, { y0: 10, y1: undefined }],
      ['below', { y0: undefined, y1: 5 }, { y0: 5, y1: 10 }],
    ] as Array<[YConfig['fill'], YCoords, YCoords]>)(
      'should be robust and works also for different axes when on same direction: 1x Left + 1x Right both %s',
      (fill, coordsA, coordsB) => {
        const wrapper = shallow(
          <ReferenceLineAnnotations
            {...defaultProps}
            data={histogramData}
            layers={createLayers([
              {
                forAccessor: `yAccessorLeftFirstId`,
                axisMode: 'left',
                lineStyle: 'solid',
                fill,
              },
              {
                forAccessor: `yAccessorRightSecondId`,
                axisMode: 'right',
                lineStyle: 'solid',
                fill,
              },
            ])}
          />
        );

        expect(wrapper.find(RectAnnotation).first().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...coordsA },
              details: coordsA.y0 ?? coordsA.y1,
              header: undefined,
            },
          ])
        );
        expect(wrapper.find(RectAnnotation).last().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...coordsB },
              details: coordsB.y1 ?? coordsB.y0,
              header: undefined,
            },
          ])
        );
      }
    );
  });
});
