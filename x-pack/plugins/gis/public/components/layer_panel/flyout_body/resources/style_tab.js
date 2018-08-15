/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiTab,
} from '@elastic/eui';
import _ from 'lodash';

export function StyleTab({ tabName, active = true, onClick }) {
  return (
    <EuiTab
      id={_.camelCase(tabName)}
      key={_.camelCase(tabName)}
      name={tabName}
      onClick={(() => {
        const name = tabName;
        return () => onClick(name);
      })()}
      isSelected={active}
    >{ tabName }
    </EuiTab>
  );
}