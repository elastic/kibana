/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiBadge } from '@elastic/eui';
import { tabColor } from '../../../../../../common/util/group_color_utils';

export const JobGroup: FC<{ name: string }> = ({ name }) => (
  <EuiBadge key={`${name}-id`} data-test-subj="mlJobGroup" color={tabColor(name)}>
    {name}
  </EuiBadge>
);
