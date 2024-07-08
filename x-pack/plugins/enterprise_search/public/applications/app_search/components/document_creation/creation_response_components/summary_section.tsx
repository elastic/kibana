/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';

import { EuiAccordion, EuiIcon } from '@elastic/eui';

import './summary_section.scss';

const ICON_PROPS = {
  error: { type: 'error', color: 'danger' },
  success: { type: 'checkInCircleFilled', color: 'success' },
  info: { type: 'iInCircle', color: 'default' },
};

interface SummarySectionAccordionProps {
  id: string;
  status: 'success' | 'error' | 'info';
  title: string;
}
export const SummarySectionAccordion: FC<PropsWithChildren<SummarySectionAccordionProps>> = ({
  id,
  status,
  title,
  children,
}) => {
  return (
    <EuiAccordion
      id={id}
      className="documentCreationSummarySection"
      arrowDisplay="right"
      paddingSize="m"
      buttonContent={
        <div className="documentCreationSummarySection__title">
          <EuiIcon type={ICON_PROPS[status].type} color={ICON_PROPS[status].color} />
          {title}
        </div>
      }
    >
      {children}
    </EuiAccordion>
  );
};

interface SummarySectionEmptyProps {
  title: string;
}
export const SummarySectionEmpty: React.FC<SummarySectionEmptyProps> = ({ title }) => {
  return (
    <div className="documentCreationSummarySection">
      <div className="documentCreationSummarySection__title">
        <EuiIcon {...ICON_PROPS.info} />
        {title}
      </div>
    </div>
  );
};
