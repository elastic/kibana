/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';

import React from 'react';

import '../../../../../common/mock/match_media';
import { mockTimelineData } from '../../../../../common/mock';
import { defaultHeaders } from '../column_headers/default_headers';
import { columnRenderers } from '../renderers';

import { DataDrivenColumns } from '.';

describe('Columns', () => {
  const headersSansTimestamp = defaultHeaders.filter((h) => h.id !== '@timestamp');

  test('it renders the expected columns', () => {
    const wrapper = shallow(
      <DataDrivenColumns
        ariaRowindex={2}
        _id={mockTimelineData[0]._id}
        columnHeaders={headersSansTimestamp}
        columnRenderers={columnRenderers}
        data={mockTimelineData[0].data}
        ecsData={mockTimelineData[0].ecs}
        hasRowRenderers={false}
        notesCount={0}
        timelineId="test"
      />
    );

    expect(wrapper).toMatchSnapshot();
  });
});
