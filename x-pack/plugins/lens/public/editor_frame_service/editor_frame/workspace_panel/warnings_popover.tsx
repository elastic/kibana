/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './workspace_panel_wrapper.scss';
import './warnings_popover.scss';

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiText, EuiButtonEmpty } from '@elastic/eui';

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
      panelPaddingSize="none"
      button={
        <EuiButtonEmpty
          color="warning"
          onClick={onButtonClick}
          iconType="alert"
          className="lnsWorkspaceWarning__button"
        >
          {warningsCount}
          <span className="lnsWorkspaceWarning__buttonText">
            {' '}
            {i18n.translate('xpack.lens.chartWarnings.number', {
              defaultMessage: `{warningsCount, plural, one {warning} other {warnings}}`,
              values: {
                warningsCount,
              },
            })}
          </span>
        </EuiButtonEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <ul className="lnsWorkspaceWarningList">
        {React.Children.map(children, (child, index) => (
          <li key={index} className="lnsWorkspaceWarningList__item">
            <EuiText size="s">{child}</EuiText>
          </li>
        ))}
      </ul>
    </EuiPopover>
  );
};
