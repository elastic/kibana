/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSwitch } from '@elastic/eui';
import React from 'react';

import * as i18n from './translations';

interface Props {
  isPtrIncluded: boolean;
  onChange: () => void;
}

export const IsPtrIncluded = React.memo<Props>(({ isPtrIncluded, onChange }) => (
  <EuiSwitch
    name="switch-ptr-included"
    label={i18n.INCLUDE_PTR_RECORDS}
    checked={isPtrIncluded}
    onChange={onChange}
  />
));

IsPtrIncluded.displayName = 'IsPtrIncluded';
