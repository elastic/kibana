/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

interface HookWrapperProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hook: () => any;
}
export const HookWrapper = (props: HookWrapperProps) => {
  const myHook = props.hook ? props.hook() : null;
  return <div>{myHook}</div>;
};
