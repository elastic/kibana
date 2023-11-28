/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBoxOptionOption } from '@elastic/eui';
import { findingsNavigation } from '../../../common/navigation/constants';
import { FindingsGroupByKind } from '../../../common/types';

export const vulnerabilitiesPathnameHandler = (
  opts: Array<EuiComboBoxOptionOption<FindingsGroupByKind>>
) => {
  const [firstOption] = opts;

  switch (firstOption?.value) {
    case 'resource':
      return findingsNavigation.vulnerabilities_by_resource.path;
    case 'default':
    default:
      return findingsNavigation.vulnerabilities.path;
  }
};
