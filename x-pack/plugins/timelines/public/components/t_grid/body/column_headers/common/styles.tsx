/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

export const FullHeightFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;
FullHeightFlexGroup.displayName = 'FullHeightFlexGroup';

export const FullHeightFlexItem = styled(EuiFlexItem)`
  height: 100%;
`;
FullHeightFlexItem.displayName = 'FullHeightFlexItem';
