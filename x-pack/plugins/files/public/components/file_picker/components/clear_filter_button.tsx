/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { FunctionComponent } from 'react';
import { debounceTime } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { EuiLink } from '@elastic/eui';
import { css } from '@emotion/react';
import { useFilePickerContext } from '../context';

interface Props {
  onClick: () => void;
}

export const ClearFilterButton: FunctionComponent<Props> = ({ onClick }) => {
  const { state } = useFilePickerContext();
  const query = useObservable(state.query$.pipe(debounceTime(100)));
  if (!query) {
    return null;
  }
  return (
    <div
      css={css`
        display: grid;
        place-items: center;
      `}
    >
      <EuiLink onClick={onClick}>Clear filter</EuiLink>
    </div>
  );
};
