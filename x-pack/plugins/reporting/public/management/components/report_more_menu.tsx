/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { FunctionComponent } from 'react';
import { EuiButtonIcon, EuiPopover, EuiHorizontalRule } from '@elastic/eui';
import { Job } from '../../lib/job';

interface Props {
  job: Job;
}

export const ReportMoreMenu: FunctionComponent<Props> = ({ job }) => {
  const [showPopover, setShowPopover] = useState<boolean>(false);
  return (
    <EuiPopover
      isOpen={showPopover}
      button={
        <EuiButtonIcon
          iconType="boxesHorizontal"
          onClick={() => setShowPopover((isShowing) => !isShowing)}
        />
      }
    >
      Download
      <EuiHorizontalRule />
      Show info
      <EuiHorizontalRule />
      Go to Kibana app
    </EuiPopover>
  );
};
