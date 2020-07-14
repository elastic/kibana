/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import classNames from 'classnames';
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useState } from 'react';
import {
  EuiNotificationBadge,
  EuiCode,
  EuiPopover,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

interface Props {
  onClick: () => void;
  isDisabled: boolean;
  ifCode: string;
}

const i18nTexts = {
  badgeBody: i18n.translate('xpack.ingestPipelines.pipelineEditor.item.ifBadgeLabel', {
    defaultMessage: 'if',
  }),
  buttonLabel: i18n.translate('xpack.ingestPipelines.pipelineEditor.item.buttonLabel', {
    defaultMessage: 'Copy condition to clipboard',
  }),
};

export const IfBadge: FunctionComponent<Props> = ({ onClick, isDisabled, ifCode }) => {
  const classes = classNames('pipelineProcessorsEditor__item__ifBadge', {
    'pipelineProcessorsEditor__item__ifBadge--disabled': isDisabled,
  });

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      anchorPosition="rightCenter"
      closePopover={() => {
        setIsPopoverOpen(false);
      }}
      button={
        <EuiNotificationBadge
          data-test-subj="ifBadge"
          className={classes}
          size="s"
          color="subdued"
          onClick={isDisabled ? undefined : () => setIsPopoverOpen((prev) => !prev)}
        >
          {i18nTexts.badgeBody}
        </EuiNotificationBadge>
      }
    >
      <EuiFlexGroup responsive={false} gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon aria-label={i18nTexts.buttonLabel} iconType="copy" onClick={onClick} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCode
            transparentBackground
            className="pipelineProcessorsEditor__item__ifBadge__codeSnippet"
          >
            {ifCode}
          </EuiCode>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
