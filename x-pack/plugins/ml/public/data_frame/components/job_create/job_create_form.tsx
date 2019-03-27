/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC, useEffect } from 'react';

import { StaticIndexPattern } from 'ui/index_patterns';

export interface JobDetailsExposedState {
  valid: boolean;
}

export function getDefaultJobCreateState() {
  return {
    valid: false,
  } as JobDetailsExposedState;
}

interface Props {
  overrides?: JobDetailsExposedState;
  indexPattern: StaticIndexPattern;
  onChange(s: JobDetailsExposedState): void;
}

export const JobCreateForm: SFC<Props> = React.memo(
  ({ overrides = {}, indexPattern, onChange }) => {
    // const defaults = { ...getDefaultJobDetailsState(), ...overrides };

    useEffect(() => {
      const valid = false;
      onChange({ valid });
    }, []);

    return <div>Job Create Form Component</div>;
  }
);
