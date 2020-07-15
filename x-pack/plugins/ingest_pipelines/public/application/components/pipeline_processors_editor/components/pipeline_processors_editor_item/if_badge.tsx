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
  EuiCodeBlock,
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
  const labelClasses = classNames('pipelineProcessorsEditor__item__ifBadge__label', {
    'pipelineProcessorsEditor__item__ifBadge__label--disabled': isDisabled,
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
          className="pipelineProcessorsEditor__item__ifBadge"
          size="s"
          color="subdued"
          onClick={isDisabled ? undefined : () => setIsPopoverOpen((prev) => !prev)}
        >
          <EuiCode className={labelClasses} transparentBackground>
            {i18nTexts.badgeBody}
          </EuiCode>
        </EuiNotificationBadge>
      }
    >
      <EuiFlexGroup justifyContent="center" alignItems="center" responsive={false} gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiCodeBlock
            fontSize="m"
            paddingSize="s"
            transparentBackground
            className="pipelineProcessorsEditor__item__ifBadge__codeSnippet"
          >
            {ifCode}
          </EuiCodeBlock>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon aria-label={i18nTexts.buttonLabel} iconType="copy" onClick={onClick} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
