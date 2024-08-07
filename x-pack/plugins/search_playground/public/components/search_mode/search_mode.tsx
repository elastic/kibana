/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSearchBar,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { ResultList } from './result_list';

export const SearchMode: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const showResults = true; // TODO demo

  return (
    <EuiFlexGroup direction="row" justifyContent="center">
      <EuiFlexItem
        grow
        css={css`
          max-width: ${euiTheme.base * 48}px;
        `}
      >
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiSearchBar />
          </EuiFlexItem>
          <EuiFlexItem className="eui-yScroll">
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                {showResults ? (
                  <ResultList />
                ) : (
                  <EuiEmptyPrompt
                    iconType={'checkInCircleFilled'}
                    iconColor="success"
                    title={<h2>Ready to search</h2>}
                    body={
                      <p>
                        Type in a query in the search bar above or view the query we automatically
                        created for you.
                      </p>
                    }
                    actions={<EuiButton>View the query</EuiButton>}
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
