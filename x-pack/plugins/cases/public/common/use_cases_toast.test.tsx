/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useToasts } from '../common/lib/kibana';
import { TestProviders } from '../common/mock';
import { useCasesToast } from './use_cases_toast';
import { mockCase } from '../containers/mock';

jest.mock('../common/lib/kibana');

const useToastsMock = useToasts as jest.Mock;

describe('Use cases toast hook', () => {
  const successMock = jest.fn();
  useToastsMock.mockImplementation(() => {
    return {
      addSuccess: successMock,
    };
  });
  it('should create a success tost when invoked with a case', () => {
    const { result } = renderHook(
      () => {
        return useCasesToast();
      },
      { wrapper: TestProviders }
    );
    result.current.showSuccessAttach(mockCase);
    expect(successMock).toHaveBeenCalled();
  });
});
