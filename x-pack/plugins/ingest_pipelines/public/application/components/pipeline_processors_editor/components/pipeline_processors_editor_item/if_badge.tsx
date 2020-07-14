/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import classNames from 'classnames';
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiNotificationBadge, EuiToolTip } from '@elastic/eui';

interface Props {
  onClick: () => void;
  isDisabled: boolean;
}

const i18nTexts = {
  badgeBody: i18n.translate('xpack.ingestPipelines.pipelineEditor.item.ifBadgeLabel', {
    defaultMessage: 'if',
  }),
  toolTip: i18n.translate('xpack.ingestPipelines.pipelineEditor.item.ifBadgeToolTipContent', {
    defaultMessage: 'Copy condition to clipboard',
  }),
};

export const IfBadge: FunctionComponent<Props> = ({ onClick, isDisabled }) => {
  const classes = classNames('pipelineProcessorsEditor__item__ifBadge', {
    'pipelineProcessorsEditor__item__ifBadge--disabled': isDisabled,
  });
  return (
    <EuiToolTip delay="long" content={i18nTexts.toolTip}>
      <EuiNotificationBadge
        data-test-subj="ifBadge"
        className={classes}
        size="s"
        color="subdued"
        onClick={isDisabled ? onClick : undefined}
      >
        {i18nTexts.badgeBody}
      </EuiNotificationBadge>
    </EuiToolTip>
  );
};
