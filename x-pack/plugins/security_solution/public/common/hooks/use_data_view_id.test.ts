/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import { renderHook } from '@testing-library/react';
import { TestProviders } from '../mock';
import { SourcererScopeName } from '../../sourcerer/store/model';
import { DEFAULT_DATA_VIEW_ID } from '../../../common/constants';
import { useDataViewId } from './use_data_view_id';
import * as sourcererSelectors from '../../sourcerer/store/selectors';

describe('useDataViewId', () => {
  it.each(Object.values(SourcererScopeName))(
    'should return the data view id for %s scope',
    (scope) => {
      const { result } = renderHook<
        string | undefined,
        PropsWithChildren<{ scope: SourcererScopeName }>
      >((props) => useDataViewId(props.scope), {
        initialProps: { scope },
        wrapper: TestProviders,
      });
      expect(result.current).toEqual(DEFAULT_DATA_VIEW_ID); // mocked value
    }
  );

  it('should return undefined if dataViewId selector returns null', () => {
    jest
      .spyOn(sourcererSelectors, 'sourcererScopeSelectedDataViewId')
      .mockImplementationOnce(() => null);

    const { result } = renderHook<
      string | undefined,
      PropsWithChildren<{ scope: SourcererScopeName }>
    >((props) => useDataViewId(props.scope), {
      initialProps: { scope: SourcererScopeName.default },
      wrapper: TestProviders,
    });
    expect(result.current).toEqual(undefined);
  });
});
