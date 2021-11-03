/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { UrlTemplate } from '../../types';

interface UrlTemplateButtonsProps {
  urlTemplates: UrlTemplate[];
  hasNodes: boolean;
  openUrlTemplate: (template: UrlTemplate) => void;
}

export const DrillDownIconLinks = ({
  hasNodes,
  urlTemplates,
  openUrlTemplate,
}: UrlTemplateButtonsProps) => {
  const drillDownsWithIcons = urlTemplates.filter(
    ({ icon }: UrlTemplate) => icon && icon.class !== ''
  );

  if (drillDownsWithIcons.length === 0) {
    return null;
  }

  const drillDowns = drillDownsWithIcons.map((cur) => {
    const onUrlTemplateClick = () => openUrlTemplate(cur);

    return (
      <EuiFlexItem grow={false}>
        <EuiToolTip content={cur.description}>
          <button
            className="kuiButton kuiButton--basic kuiButton--small"
            type="button"
            disabled={hasNodes}
            onClick={onUrlTemplateClick}
          >
            <span className={`kuiIcon ${cur.icon?.class || ''}`} />
          </button>
        </EuiToolTip>
      </EuiFlexItem>
    );
  });

  return (
    <EuiFlexGroup
      className="gphDrillDownIconLinks"
      justifyContent="flexStart"
      alignItems="center"
      gutterSize="xs"
      responsive={false}
    >
      {drillDowns}
    </EuiFlexGroup>
  );
};
