/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metricChart, MetricChart } from './expression';
import { LensMultiTable } from '../types';
import React from 'react';
import { shallow } from 'enzyme';
import { MetricConfig } from './types';
import { createMockExecutionContext } from '../../../../../src/plugins/expressions/common/mocks';
import { IFieldFormat } from '../../../../../src/plugins/data/public';

function sampleArgs() {
  const data: LensMultiTable = {
    type: 'lens_multitable',
    tables: {
      l1: {
        type: 'datatable',
        columns: [
          { id: 'a', name: 'a', meta: { type: 'string' } },
          { id: 'b', name: 'b', meta: { type: 'string' } },
          { id: 'c', name: 'c', meta: { type: 'number' } },
        ],
        rows: [{ a: 10110, b: 2, c: 3 }],
      },
    },
  };

  const args: MetricConfig = {
    accessor: 'a',
    layerId: 'l1',
    title: 'My fanci metric chart',
    description: 'Fancy chart description',
    metricTitle: 'My fanci metric chart',
    mode: 'full',
  };

  const noAttributesArgs: MetricConfig = {
    accessor: 'a',
    layerId: 'l1',
    title: '',
    description: '',
    metricTitle: 'My fanci metric chart',
    mode: 'full',
  };

  return { data, args, noAttributesArgs };
}

describe('metric_expression', () => {
  describe('metricChart', () => {
    test('it renders with the specified data and args', () => {
      const { data, args } = sampleArgs();
      const result = metricChart.fn(data, args, createMockExecutionContext());

      expect(result).toEqual({
        type: 'render',
        as: 'lens_metric_chart_renderer',
        value: { data, args },
      });
    });
  });

  describe('MetricChart component', () => {
    test('it renders the all attributes when passed (title, description, metricTitle, value)', () => {
      const { data, args } = sampleArgs();

      expect(
        shallow(<MetricChart data={data} args={args} formatFactory={(x) => x as IFieldFormat} />)
      ).toMatchInlineSnapshot(`
        <VisualizationContainer
          className="lnsMetricExpression__container"
          reportDescription="Fancy chart description"
          reportTitle="My fanci metric chart"
        >
          <AutoScale>
            <div
              data-test-subj="lns_metric_value"
              style={
                Object {
                  "fontSize": "60pt",
                  "fontWeight": 600,
                }
              }
            >
              10110
            </div>
            <div
              data-test-subj="lns_metric_title"
              style={
                Object {
                  "fontSize": "24pt",
                }
              }
            >
              My fanci metric chart
            </div>
          </AutoScale>
        </VisualizationContainer>
      `);
    });

    test('it renders only chart content when title and description are empty strings', () => {
      const { data, noAttributesArgs } = sampleArgs();

      expect(
        shallow(
          <MetricChart
            data={data}
            args={noAttributesArgs}
            formatFactory={(x) => x as IFieldFormat}
          />
        )
      ).toMatchInlineSnapshot(`
        <VisualizationContainer
          className="lnsMetricExpression__container"
          reportDescription=""
          reportTitle=""
        >
          <AutoScale>
            <div
              data-test-subj="lns_metric_value"
              style={
                Object {
                  "fontSize": "60pt",
                  "fontWeight": 600,
                }
              }
            >
              10110
            </div>
            <div
              data-test-subj="lns_metric_title"
              style={
                Object {
                  "fontSize": "24pt",
                }
              }
            >
              My fanci metric chart
            </div>
          </AutoScale>
        </VisualizationContainer>
      `);
    });

    test('it does not render metricTitle in reduced mode', () => {
      const { data, noAttributesArgs } = sampleArgs();

      expect(
        shallow(
          <MetricChart
            data={data}
            args={{ ...noAttributesArgs, mode: 'reduced' }}
            formatFactory={(x) => x as IFieldFormat}
          />
        )
      ).toMatchInlineSnapshot(`
        <VisualizationContainer
          className="lnsMetricExpression__container"
          reportDescription=""
          reportTitle=""
        >
          <AutoScale>
            <div
              data-test-subj="lns_metric_value"
              style={
                Object {
                  "fontSize": "60pt",
                  "fontWeight": 600,
                }
              }
            >
              10110
            </div>
          </AutoScale>
        </VisualizationContainer>
      `);
    });

    test('it renders an EmptyPlaceholder when no tables is passed as data', () => {
      const { data, noAttributesArgs } = sampleArgs();

      expect(
        shallow(
          <MetricChart
            data={{ ...data, tables: {} }}
            args={noAttributesArgs}
            formatFactory={(x) => x as IFieldFormat}
          />
        )
      ).toMatchInlineSnapshot(`
              <EmptyPlaceholder
                icon={[Function]}
              />
          `);
    });

    test('it renders an EmptyPlaceholder when null value is passed as data', () => {
      const { data, noAttributesArgs } = sampleArgs();

      data.tables.l1.rows[0].a = null;

      expect(
        shallow(
          <MetricChart
            data={data}
            args={noAttributesArgs}
            formatFactory={(x) => x as IFieldFormat}
          />
        )
      ).toMatchInlineSnapshot(`
        <EmptyPlaceholder
          icon={[Function]}
        />
      `);
    });

    test('it renders 0 value', () => {
      const { data, noAttributesArgs } = sampleArgs();

      data.tables.l1.rows[0].a = 0;

      expect(
        shallow(
          <MetricChart
            data={data}
            args={noAttributesArgs}
            formatFactory={(x) => x as IFieldFormat}
          />
        )
      ).toMatchInlineSnapshot(`
        <VisualizationContainer
          className="lnsMetricExpression__container"
          reportDescription=""
          reportTitle=""
        >
          <AutoScale>
            <div
              data-test-subj="lns_metric_value"
              style={
                Object {
                  "fontSize": "60pt",
                  "fontWeight": 600,
                }
              }
            >
              0
            </div>
            <div
              data-test-subj="lns_metric_title"
              style={
                Object {
                  "fontSize": "24pt",
                }
              }
            >
              My fanci metric chart
            </div>
          </AutoScale>
        </VisualizationContainer>
      `);
    });
  });
});
