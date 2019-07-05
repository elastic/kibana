/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiTab
} from '@elastic/eui';
import _ from 'lodash';

export function StyleTab(props) {
  const { name, selected, onClick } = props;
  return name && (
    <EuiTab
      id={_.camelCase(name)}
      key={_.camelCase(name)}
      name={name}
      onClick={(() => {
        const tabName = name;
        return () => onClick(tabName);
      })()}
      isSelected={name === selected}
    >{ name }
    </EuiTab>
  ) || null;
}