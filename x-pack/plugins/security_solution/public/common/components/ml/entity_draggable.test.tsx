/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import '../../mock/match_media';
import { EntityDraggableComponent } from './entity_draggable';
import { TestProviders } from '../../mock/test_providers';
import { useMountAppended } from '../../utils/use_mount_appended';

describe('entity_draggable', () => {
  const mount = useMountAppended();

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <EntityDraggableComponent
        idPrefix="id-prefix"
        entityName="entity-name"
        entityValue="entity-value"
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('renders with entity name with entity value as text', () => {
    const wrapper = mount(
      <TestProviders>
        <EntityDraggableComponent
          idPrefix="id-prefix"
          entityName="entity-name"
          entityValue="entity-value"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('entity-name: "entity-value"');
  });
});
