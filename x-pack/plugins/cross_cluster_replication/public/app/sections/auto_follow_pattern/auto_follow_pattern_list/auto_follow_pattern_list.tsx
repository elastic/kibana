/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';

interface AutoFollowPatternListProps {
  loadAutoFollowPatterns: () => void;
}

export const AutoFollowPatternList: React.SFC<AutoFollowPatternListProps> = ({
  loadAutoFollowPatterns,
}) => <EuiButton onClick={() => loadAutoFollowPatterns()}>Test Redux API Middleware</EuiButton>;
