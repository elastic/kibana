/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { FunctionComponent } from 'react';
import { EuiButtonIcon, EuiPopover } from '@elastic/eui';
import { Job } from '../../lib/job';

interface Props {
  job: Job;
}

export const ReportMoreMenu: FunctionComponent<Props> = ({}) => {
  const [showPopover, setShowPopover] = useState<boolean>(false);

  return (
    <EuiPopover
      isOpen={showPopover}
      button={<EuiButtonIcon onClick={() => setShowPopover((isShowing) => !isShowing)} />}
    >
      temp
    </EuiPopover>
  );
};
