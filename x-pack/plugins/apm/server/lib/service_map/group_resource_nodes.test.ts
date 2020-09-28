/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { groupResourceNodes } from './group_resource_nodes';
import preGroupedData from './mock_responses/group_resource_nodes_pregrouped.json';
import expectedGroupedData from './mock_responses/group_resource_nodes_grouped.json';

describe('groupResourceNodes', () => {
  it('should group external nodes', () => {
    const responseWithGroups = groupResourceNodes(preGroupedData);
    expect(responseWithGroups.elements).toHaveLength(
      expectedGroupedData.elements.length
    );
    for (const element of responseWithGroups.elements) {
      const expectedElement = expectedGroupedData.elements.find(
        ({ data: { id } }: { data: { id: string } }) => id === element.data.id
      );
      expect(element).toMatchObject(expectedElement);
    }
  });
});
