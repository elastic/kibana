/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { List } from './list';
import { PluginStatement } from '../pipeline/plugin_statement';
import { IfStatement } from '../pipeline/if_statement';
import { PluginElement } from './plugin_element';
import { IfElement } from './if_element';
import { ElseElement } from './else_element';

describe('pipelineToList', () => {
  let pipeline;

  beforeEach(() => {
    pipeline = {
      inputStatements: [PluginStatement.fromPipelineGraphVertex({ id: 'first' })],
      filterStatements: [
        new IfStatement(
          { id: 'if' },
          [PluginStatement.fromPipelineGraphVertex({ id: 'if_child' })],
          [PluginStatement.fromPipelineGraphVertex({ id: 'else_child' })]
        ),
      ],
      outputStatements: [PluginStatement.fromPipelineGraphVertex({ id: 'output' })],
      queue: {},
    };
  });

  it('creates list with element for each statement', () => {
    const result = List.fromPipeline(pipeline);
    const { inputs, filters, outputs } = result;

    expect(inputs).toHaveLength(1);
    expect(filters).toHaveLength(4);
    expect(outputs).toHaveLength(1);
  });

  it('creates list with if in outputs', () => {
    pipeline.outputStatements.push(
      new IfStatement(
        { id: 'output_if' },
        [PluginStatement.fromPipelineGraphVertex({ id: 'output_true' })],
        [PluginStatement.fromPipelineGraphVertex({ id: 'output_else' })]
      )
    );

    const result = List.fromPipeline(pipeline);
    const { inputs, filters, outputs } = result;

    expect(inputs).toHaveLength(1);
    expect(filters).toHaveLength(4);
    expect(outputs).toHaveLength(5);
    expect(outputs[0]).toBeInstanceOf(PluginElement);
    expect(outputs[1]).toBeInstanceOf(IfElement);
    expect(outputs[2]).toBeInstanceOf(PluginElement);
    expect(outputs[3]).toBeInstanceOf(ElseElement);
    expect(outputs[4]).toBeInstanceOf(PluginElement);
  });

  it('creates list for multi-nested if/else statements in filter section', () => {
    pipeline.filterStatements = [
      new IfStatement(
        { id: 'filter_if_1' },
        [
          new IfStatement(
            { id: 'filter_if_2' },
            [PluginStatement.fromPipelineGraphVertex({ id: 'plugin_1' })],
            []
          ),
        ],
        [
          new IfStatement(
            { id: 'filter_if_3' },
            [PluginStatement.fromPipelineGraphVertex({ id: 'plugin_2' })],
            [PluginStatement.fromPipelineGraphVertex({ id: 'plugin_3' })]
          ),
        ]
      ),
    ];

    const result = List.fromPipeline(pipeline);
    const { inputs, filters, outputs } = result;

    expect(inputs).toHaveLength(1);
    expect(outputs).toHaveLength(1);
    expect(filters).toHaveLength(8);

    expect(filters[0].id).toBe('filter_if_1');
    expect(filters[0].depth).toBe(0);
    expect(filters[0].parentId).toBe(null);
    expect(filters[0]).toBeInstanceOf(IfElement);

    expect(filters[1].id).toBe('filter_if_2');
    expect(filters[1].depth).toBe(1);
    expect(filters[1].parentId).toBe('filter_if_1');
    expect(filters[1]).toBeInstanceOf(IfElement);

    expect(filters[2].id).toBe('plugin_1');
    expect(filters[2].depth).toBe(2);
    expect(filters[2].parentId).toBe('filter_if_2');
    expect(filters[2]).toBeInstanceOf(PluginElement);

    expect(filters[3].id).toBe('filter_if_1_else');
    expect(filters[3].depth).toBe(0);
    expect(filters[3].parentId).toBe(null);
    expect(filters[3]).toBeInstanceOf(ElseElement);

    expect(filters[4].id).toBe('filter_if_3');
    expect(filters[4].depth).toBe(1);
    expect(filters[4].parentId).toBe('filter_if_1_else');
    expect(filters[4]).toBeInstanceOf(IfElement);

    expect(filters[5].id).toBe('plugin_2');
    expect(filters[5].depth).toBe(2);
    expect(filters[5].parentId).toBe('filter_if_3');
    expect(filters[5]).toBeInstanceOf(PluginElement);

    expect(filters[6].id).toBe('filter_if_3_else');
    expect(filters[6].depth).toBe(1);
    expect(filters[6].parentId).toBe('filter_if_1_else');
    expect(filters[6]).toBeInstanceOf(ElseElement);

    expect(filters[7].id).toBe('plugin_3');
    expect(filters[7].depth).toBe(2);
    expect(filters[7].parentId).toBe('filter_if_3_else');
    expect(filters[7]).toBeInstanceOf(PluginElement);
  });
});
