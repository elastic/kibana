/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectionElement } from '../../../common/service_map';
import { groupResourceNodes } from './group_resource_nodes';
import expectedGroupedData from './mock_responses/group_resource_nodes_grouped.json';
import preGroupedData from './mock_responses/group_resource_nodes_pregrouped.json';

describe('groupResourceNodes', () => {
  it('should group external nodes', () => {
    const responseWithGroups = groupResourceNodes(
      preGroupedData as { elements: ConnectionElement[] }
    );
    expect(responseWithGroups.elements).toHaveLength(
      expectedGroupedData.elements.length
    );
    for (const element of responseWithGroups.elements) {
      const expectedElement = expectedGroupedData.elements.find(
        ({ data: { id } }: { data: { id: string } }) => id === element.data.id
      )!;
      expect(element).toMatchObject(expectedElement);
    }
  });
});
