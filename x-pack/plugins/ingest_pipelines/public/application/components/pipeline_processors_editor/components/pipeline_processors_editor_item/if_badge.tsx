/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import classNames from 'classnames';
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiNotificationBadge, EuiCode } from '@elastic/eui';

interface Props {
  isDisabled: boolean;
}

export const IfBadge: FunctionComponent<Props> = ({ isDisabled }) => {
  const labelClasses = classNames('pipelineProcessorsEditor__item__ifBadge__label', {
    'pipelineProcessorsEditor__item__ifBadge__label--disabled': isDisabled,
  });

  return (
    <EuiNotificationBadge
      data-test-subj="ifBadge"
      className="pipelineProcessorsEditor__item__ifBadge"
      size="s"
      color="subdued"
    >
      <EuiCode className={labelClasses} transparentBackground>
        {i18n.translate('xpack.ingestPipelines.pipelineEditor.item.ifBadgeLabel', {
          defaultMessage: 'if',
        })}
      </EuiCode>
    </EuiNotificationBadge>
  );
};
