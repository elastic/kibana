/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetUpdatedTags } from '.';
import { renderHook } from '@testing-library/react-hooks';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { TagFilter } from '../../../../common/endpoint/service/artifacts/utils';

describe('useGetUpdatedTags hook', () => {
  const firstFilter: TagFilter = (tag) => tag.startsWith('first:');
  const secondFilter: TagFilter = (tag) => tag.startsWith('second:') || tag === 'special_second';
  const thirdFilter: TagFilter = (tag) => tag.startsWith('third:');

  const getFiltersInOrder = () => ({
    first: firstFilter,
    second: secondFilter,
    third: thirdFilter,
  });

  const getExampleException = (): Partial<ExceptionListItemSchema> => ({
    tags: [
      'first:mozzarella',
      'first:roquefort',

      'second:cabernet',
      'second:shiraz',
      'special_second',

      'third:tagliatelle',
      'third:penne',
    ],
  });

  describe('getTagsUpdatedBy', () => {
    describe('when `tags` is undefined', () => {
      it('should return empty array when the update is empty', () => {
        const { result } = renderHook(() => useGetUpdatedTags({}, getFiltersInOrder()));

        expect(result.current.getTagsUpdatedBy('second', [])).toStrictEqual([]);
      });

      it('should return new array with the update', () => {
        const { result } = renderHook(() => useGetUpdatedTags({}, getFiltersInOrder()));

        expect(result.current.getTagsUpdatedBy('second', ['special_second'])).toStrictEqual([
          'special_second',
        ]);
      });
    });

    describe('when removing tags from a category', () => {
      it('should be able to remove a tag category from the start', () => {
        const { result } = renderHook(() =>
          useGetUpdatedTags(getExampleException(), getFiltersInOrder())
        );

        expect(result.current.getTagsUpdatedBy('first', [])).toStrictEqual([
          'second:cabernet',
          'second:shiraz',
          'special_second',

          'third:tagliatelle',
          'third:penne',
        ]);
      });

      it('should be able to remove a tag category from the middle', () => {
        const { result } = renderHook(() =>
          useGetUpdatedTags(getExampleException(), getFiltersInOrder())
        );

        expect(result.current.getTagsUpdatedBy('second', [])).toStrictEqual([
          'first:mozzarella',
          'first:roquefort',

          'third:tagliatelle',
          'third:penne',
        ]);
      });

      it('should be able to remove a tag category from the end', () => {
        const { result } = renderHook(() =>
          useGetUpdatedTags(getExampleException(), getFiltersInOrder())
        );

        expect(result.current.getTagsUpdatedBy('third', [])).toStrictEqual([
          'first:mozzarella',
          'first:roquefort',

          'second:cabernet',
          'second:shiraz',
          'special_second',
        ]);
      });

      it('should be able to remove all tags category by category and keeping the original order', () => {
        const { result, rerender } = renderHook(
          ({ exception, filters }) => useGetUpdatedTags(exception, filters),
          { initialProps: { exception: getExampleException(), filters: getFiltersInOrder() } }
        );

        let tags = result.current.getTagsUpdatedBy('first', []);
        expect(tags).toStrictEqual([
          'second:cabernet',
          'second:shiraz',
          'special_second',

          'third:tagliatelle',
          'third:penne',
        ]);

        rerender({ exception: { tags }, filters: getFiltersInOrder() });
        tags = result.current.getTagsUpdatedBy('second', []);
        expect(tags).toStrictEqual(['third:tagliatelle', 'third:penne']);

        rerender({ exception: { tags }, filters: getFiltersInOrder() });
        tags = result.current.getTagsUpdatedBy('third', []);
        expect(tags).toStrictEqual([]);
      });
    });

    it('should keep original order of categories after multiple updates', () => {
      let tags: string[] = [];
      const { result, rerender } = renderHook(
        ({ exception, filters }) => useGetUpdatedTags(exception, filters),
        { initialProps: { exception: { tags }, filters: getFiltersInOrder() } }
      );

      // add middle
      tags = result.current.getTagsUpdatedBy('second', ['special_second']);
      expect(tags).toStrictEqual(['special_second']);

      // add last
      rerender({ exception: { tags }, filters: getFiltersInOrder() });
      tags = result.current.getTagsUpdatedBy('third', ['third:spaghetti']);
      expect(tags).toStrictEqual(['special_second', 'third:spaghetti']);

      // add first
      rerender({ exception: { tags }, filters: getFiltersInOrder() });
      tags = result.current.getTagsUpdatedBy('first', ['first:brie']);
      expect(tags).toStrictEqual(['first:brie', 'special_second', 'third:spaghetti']);
    });

    it('should update category order on any change if filter is changed (although it should not)', () => {
      const { result, rerender } = renderHook(
        ({ exception, filters }) => useGetUpdatedTags(exception, filters),
        { initialProps: { exception: getExampleException(), filters: getFiltersInOrder() } }
      );

      let tags = result.current.getTagsUpdatedBy('second', ['second:shiraz']);
      expect(tags).toStrictEqual([
        'first:mozzarella',
        'first:roquefort',

        'second:shiraz',

        'third:tagliatelle',
        'third:penne',
      ]);

      const newFilterOrder = {
        third: thirdFilter,
        first: firstFilter,
        second: secondFilter,
      };

      rerender({ exception: { tags }, filters: newFilterOrder });
      tags = result.current.getTagsUpdatedBy('third', ['third:spaghetti']);

      expect(tags).toStrictEqual([
        'third:spaghetti',

        'first:mozzarella',
        'first:roquefort',

        'second:shiraz',
      ]);
    });

    it('should not mutate input parameters', () => {
      const inputFilters = getFiltersInOrder();
      const inputException = getExampleException();

      const { result } = renderHook(() => useGetUpdatedTags(inputException, inputFilters));
      result.current.getTagsUpdatedBy('third', []);

      expect(inputFilters).toStrictEqual(getFiltersInOrder());
      expect(inputException).toStrictEqual(getExampleException());
    });
  });
});
