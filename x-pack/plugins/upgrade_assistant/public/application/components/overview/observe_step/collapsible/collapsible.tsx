/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import { EuiIcon, EuiPanel, EuiFlexItem, EuiFlexGroup, EuiButtonEmpty } from '@elastic/eui';

import './_collapsible.scss';

interface CollapsibleProps {
  children: React.ReactNode;
  renderFooterLinks: React.ReactNode;
}

export const Collapsible: FunctionComponent<CollapsibleProps> = ({
  children,
  renderFooterLinks,
}) => {
  const [isExpanded, setExpanded] = useState<boolean>(false);

  return (
    <EuiPanel className={`upgCollapsible ${isExpanded ? '' : 'collapsed'}`}>
      <div className="upgCollapsibleContent">{children}</div>

      <EuiPanel paddingSize="s" hasShadow={false} className="upgCollapsibleFooter">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>{renderFooterLinks}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="xs" onClick={() => setExpanded(!isExpanded)}>
              {isExpanded ? 'Collapse' : 'Expand'}
              <EuiIcon type={isExpanded ? 'arrowUp' : 'arrowDown'} style={{ marginLeft: 8 }} />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPanel>
  );
};
