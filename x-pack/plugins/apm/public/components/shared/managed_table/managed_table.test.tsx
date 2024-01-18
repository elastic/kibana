/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { ITableColumn, UnoptimizedManagedTable, shouldfetchServer } from '.';

interface Person {
  name: string;
  age: number;
}

describe('ManagedTable', () => {
  describe('UnoptimizedManagedTable', () => {
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
          <UnoptimizedManagedTable<Person>
            columns={columns}
            items={people}
            initialPageSize={25}
          />
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

  describe('shouldfetchServer', () => {
    it('returns true if maxCountExceeded is true', () => {
      const result = shouldfetchServer({
        maxCountExceeded: true,
        newSearchQuery: 'apple',
        oldSearchQuery: 'banana',
      });
      expect(result).toBeTruthy();
    });

    it('returns true if newSearchQuery does not include oldSearchQuery', () => {
      const result = shouldfetchServer({
        maxCountExceeded: false,
        newSearchQuery: 'grape',
        oldSearchQuery: 'banana',
      });
      expect(result).toBeTruthy();
    });

    it('returns false if maxCountExceeded is false and newSearchQuery includes oldSearchQuery', () => {
      const result = shouldfetchServer({
        maxCountExceeded: false,
        newSearchQuery: 'banana',
        oldSearchQuery: 'ban',
      });
      expect(result).toBeFalsy();
    });

    it('returns true if maxCountExceeded is true even if newSearchQuery includes oldSearchQuery', () => {
      const result = shouldfetchServer({
        maxCountExceeded: true,
        newSearchQuery: 'banana',
        oldSearchQuery: 'ban',
      });
      expect(result).toBeTruthy();
    });

    it('returns true if maxCountExceeded is true and newSearchQuery is empty', () => {
      const result = shouldfetchServer({
        maxCountExceeded: true,
        newSearchQuery: '',
        oldSearchQuery: 'banana',
      });
      expect(result).toBeTruthy();
    });

    it('returns false if maxCountExceeded is false and both search queries are empty', () => {
      const result = shouldfetchServer({
        maxCountExceeded: false,
        newSearchQuery: '',
        oldSearchQuery: '',
      });
      expect(result).toBeFalsy();
    });
  });
});
