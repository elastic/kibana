/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './workspace_panel_wrapper.scss';

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiText, EuiButtonEmpty, EuiHorizontalRule } from '@elastic/eui';

export const WarningsPopover = ({
  children,
}: {
  children?: React.ReactNode | React.ReactNode[];
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (!children) {
    return null;
  }

  const onButtonClick = () => setIsPopoverOpen((isOpen) => !isOpen);
  const closePopover = () => setIsPopoverOpen(false);
  const warningsCount = React.Children.count(children);
  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          onClick={onButtonClick}
          iconType="alert"
          className="lnsWorkspaceWarningButton"
        >
          {i18n.translate('xpack.lens.chartWarnings.number', {
            defaultMessage: `{warningsCount} {warningsCount, plural, one {warning} other {warnings}}`,
            values: {
              warningsCount,
            },
          })}
        </EuiButtonEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      {React.Children.map(children, (child, index) => (
        <>
          <EuiText style={{ width: 280 }}>{child}</EuiText>
          {warningsCount - 1 !== index && <EuiHorizontalRule margin="s" />}
        </>
      ))}
    </EuiPopover>
  );
};
