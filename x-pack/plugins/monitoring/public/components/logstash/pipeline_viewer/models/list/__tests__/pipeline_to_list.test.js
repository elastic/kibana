/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipelineToList } from '../pipeline_to_list';
import { PluginStatement } from '../../pipeline/plugin_statement';
import { IfStatement } from '../../pipeline/if_statement';
import { PluginElement } from '../plugin_element';
import { IfElement } from '../if_element';
import { ElseElement } from '../else_element';

describe('pipelineToList', () => {
  let pipeline;

  beforeEach(() => {
    pipeline = {
      inputStatements: [
        PluginStatement.fromPipelineGraphVertex({ id: 'first' }),
      ],
      filterStatements: [
        new IfStatement(
          { id: 'if' },
          [ PluginStatement.fromPipelineGraphVertex({ id: 'if_child' })],
          [ PluginStatement.fromPipelineGraphVertex({ id: 'else_child' })]
        )
      ],
      outputStatements: [
        PluginStatement.fromPipelineGraphVertex({ id: 'output' })
      ],
      queue: { }
    };
  });

  it('creates list with element for each statement', () => {
    const result = pipelineToList(pipeline);
    const {
      inputs,
      filters,
      outputs
    } = result;

    expect(inputs).toHaveLength(1);
    expect(filters).toHaveLength(4);
    expect(outputs).toHaveLength(1);
  });

  it('creates list with if in outputs', () => {
    pipeline.outputStatements.push(
      new IfStatement(
        { id: 'output_if' },
        [ PluginStatement.fromPipelineGraphVertex({ id: 'output_true' })],
        [ PluginStatement.fromPipelineGraphVertex({ id: 'output_else' })]
      )
    );

    const result = pipelineToList(pipeline);
    const {
      inputs,
      filters,
      outputs
    } = result;

    expect(inputs).toHaveLength(1);
    expect(filters).toHaveLength(4);
    expect(outputs).toHaveLength(5);
    expect(outputs[0]).toBeInstanceOf(PluginElement);
    expect(outputs[1]).toBeInstanceOf(IfElement);
    expect(outputs[2]).toBeInstanceOf(PluginElement);
    expect(outputs[3]).toBeInstanceOf(ElseElement);
    expect(outputs[4]).toBeInstanceOf(PluginElement);
  });
});
