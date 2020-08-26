/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useMemo } from 'react';
import { useSourcererContext } from './index';
import { SourcererScopeName } from '../../store/sourcerer/model';

interface PassedProps extends React.PropsWithChildren<unknown> {
  sourcererIndexPatterns: string[];
}
export const withSourcerer = (
  BaseComponent: React.ComponentType<PassedProps>,
  sourcererScope: SourcererScopeName = SourcererScopeName.default
) => (props: unknown) => {
  const { getSourcererScopeById } = useSourcererContext();
  const blah = useMemo(() => getSourcererScopeById(sourcererScope), [getSourcererScopeById]);
  const { selectedPatterns } = blah;
  console.log(`withSourcerer getSourcererScopeById(${sourcererScope})`, blah);
  return <BaseComponent {...props} sourcererIndexPatterns={selectedPatterns} />;
};
