/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFlexGroup } from '@elastic/eui';
// @ts-expect-error types are not available for this package yet
import { Results } from '@elastic/react-search-ui';
import { useValues } from 'kea';

import { EngineLogic } from '../../engine';
import { ResultView } from './views';

// TODO This is temporary until we create real Result type
interface Result {
  [key: string]: {
    raw: string | string[] | number | number[] | undefined;
  };
}

export const SearchExperienceContent: React.FC = () => {
  const { engineName } = useValues(EngineLogic);

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <Results
        titleField="id"
        resultView={(props: { result: Result }) => {
          return <ResultView {...props} engineName={engineName} />;
        }}
      />
    </EuiFlexGroup>
  );
};
