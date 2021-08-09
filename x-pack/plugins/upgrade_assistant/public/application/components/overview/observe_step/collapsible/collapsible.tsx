/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import classNames from 'classnames';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiPanel, EuiFlexItem, EuiFlexGroup, EuiButtonEmpty } from '@elastic/eui';

interface CollapsibleProps {
  children: React.ReactNode;
  renderFooter: React.ReactNode;
  showFooter: boolean;
}

const i18nTexts = {
  collapseLabel: i18n.translate('xpack.upgradeAssistant.overview.collapseLabel', {
    defaultMessage: 'Collapse',
  }),
  expandLabel: i18n.translate('xpack.upgradeAssistant.overview.expandLabel', {
    defaultMessage: 'Expand',
  }),
};

export const Collapsible: FunctionComponent<CollapsibleProps> = ({
  children,
  renderFooter,
  showFooter,
}) => {
  const [isExpanded, setExpanded] = useState(false);

  const panelClassName = classNames('upgCollapsible', {
    collapsed: !isExpanded,
    compact: !showFooter,
  });

  return (
    <EuiPanel className={panelClassName}>
      <div className="upgCollapsibleContent">{children}</div>

      {showFooter && (
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
      )}
    </EuiPanel>
  );
};
