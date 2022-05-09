/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { ITableColumn, UnoptimizedManagedTable } from '.';

interface Person {
  name: string;
  age: number;
}

describe('ManagedTable', () => {
  const people: Person[] = [
    { name: 'Jess', age: 29 },
    { name: 'Becky', age: 43 },
    { name: 'Thomas', age: 31 },
  ];
  const columns: Array<ITableColumn<Person>> = [
    {
      field: 'name',
      name: 'Name',
      sortable: true,
      render: (name) => `Name: ${name}`,
    },
    { field: 'age', name: 'Age', render: (age) => `Age: ${age}` },
  ];

  it('should render a page-full of items, with defaults', () => {
    expect(
      shallow(
        <UnoptimizedManagedTable<Person> columns={columns} items={people} />
      )
    ).toMatchSnapshot();
  });

  it('should render when specifying initial values', () => {
    expect(
      shallow(
        <UnoptimizedManagedTable<Person>
          columns={columns}
          items={people}
          initialSortField="age"
          initialSortDirection="desc"
          initialPageIndex={1}
          initialPageSize={2}
          showPerPageOptions={false}
        />
      )
    ).toMatchSnapshot();
  });
});
