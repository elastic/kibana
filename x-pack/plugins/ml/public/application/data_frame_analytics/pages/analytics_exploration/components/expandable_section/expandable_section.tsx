/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './expandable_section.scss';

import React, { useState, FC, ReactNode } from 'react';

import { EuiButtonEmpty, EuiPanel } from '@elastic/eui';

interface ExpandableSectionProps {
  content: ReactNode;
  headerContent: ReactNode;
  isExpanded?: boolean;
  title: ReactNode;
}

export const ExpandableSection: FC<ExpandableSectionProps> = ({
  headerContent,
  // For now we don't have a need for complete external control
  // and just want to pass in a default value. If we wanted
  // full external control we'd also need to add a onToggleExpanded()
  // callback.
  isExpanded: isExpandedDefault = true,
  content,
  title,
}) => {
  const [isExpanded, setIsExpanded] = useState(isExpandedDefault);
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <EuiPanel paddingSize="none" data-test-subj="mlDFAnalyticsOutlierExplorationTablePanel">
      <div className="mlExpandableSection">
        <EuiButtonEmpty
          onClick={toggleExpanded}
          iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
          size="l"
          iconSide="right"
          flush="left"
        >
          {title}
        </EuiButtonEmpty>
        {headerContent}
      </div>
      {isExpanded && content}
    </EuiPanel>
  );
};
