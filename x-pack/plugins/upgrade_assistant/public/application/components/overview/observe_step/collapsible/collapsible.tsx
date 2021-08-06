/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiPanel, EuiFlexItem, EuiFlexGroup, EuiButtonEmpty } from '@elastic/eui';

import './_collapsible.scss';

interface CollapsibleProps {
  children: React.ReactNode;
  renderFooter: React.ReactNode;
}

const i18nTexts = {
  collapseLabel: i18n.translate('xpack.upgradeAssistant.overview.collapseLabel', {
    defaultMessage: 'Collapse',
  }),
  expandLabel: i18n.translate('xpack.upgradeAssistant.overview.expandLabel', {
    defaultMessage: 'Expand',
  }),
};

export const Collapsible: FunctionComponent<CollapsibleProps> = ({ children, renderFooter }) => {
  const [isExpanded, setExpanded] = useState<boolean>(false);

  return (
    <EuiPanel className={`upgCollapsible ${isExpanded ? '' : 'collapsed'}`}>
      <div className="upgCollapsibleContent">{children}</div>

      <EuiPanel paddingSize="s" hasShadow={false} className="upgCollapsibleFooter">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>{renderFooter}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="xs" onClick={() => setExpanded(!isExpanded)}>
              {isExpanded ? i18nTexts.collapseLabel : i18nTexts.expandLabel}
              <EuiIcon type={isExpanded ? 'arrowUp' : 'arrowDown'} style={{ marginLeft: 8 }} />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPanel>
  );
};
