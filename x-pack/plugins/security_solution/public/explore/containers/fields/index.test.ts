/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '../../../common/lib/kibana';
import { useIsFieldInIndexPattern } from '.';
import { renderHook } from '@testing-library/react-hooks';

jest.mock('../../../common/lib/kibana');
const mockUseKibana = useKibana as jest.Mock;
describe('useIsFieldInIndexPattern', () => {
  beforeAll(() => {
    mockUseKibana.mockReturnValue({
      services: {
        data: {
          dataViews: {
            getFieldsForWildcard: () => [],
          },
        },
      },
    });
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('returns false when no fields in field list exist in the index pattern', async () => {
    const {
      result: { current: isFieldInIndexPattern },
    } = renderHook(useIsFieldInIndexPattern);
    const res = await isFieldInIndexPattern('index-pattern-*', ['fields.list']);
    expect(res).toEqual(false);
  });
  it('returns false when some but not all fields in field list exist in the index pattern', async () => {
    mockUseKibana.mockReturnValue({
      services: {
        http: {},
        data: {
          dataViews: {
            getFieldsForWildcard: () => [{ name: 'fields.list' }],
          },
        },
      },
    });
    const {
      result: { current: isFieldInIndexPattern },
    } = renderHook(useIsFieldInIndexPattern);
    const res = await isFieldInIndexPattern('index-pattern-*', ['fields.list', 'another']);
    expect(res).toEqual(false);
  });
  it('returns true when all fields in field list exist in the index pattern', async () => {
    mockUseKibana.mockReturnValue({
      services: {
        http: {},
        data: {
          dataViews: {
            getFieldsForWildcard: () => [{ name: 'fields.list' }],
          },
        },
      },
    });
    const {
      result: { current: isFieldInIndexPattern },
    } = renderHook(useIsFieldInIndexPattern);
    const res = await isFieldInIndexPattern('index-pattern-*', ['fields.list']);
    expect(res).toEqual(true);
  });
});
