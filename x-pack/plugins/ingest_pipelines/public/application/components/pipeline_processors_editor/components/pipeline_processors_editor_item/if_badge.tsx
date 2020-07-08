/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiNotificationBadge, EuiToolTip } from '@elastic/eui';

interface Props {
  onClick: () => void;
}

const i18nTexts = {
  badgeBody: i18n.translate('xpack.ingestPipelines.pipelineEditor.item.moveButtonLabel', {
    defaultMessage: 'if',
  }),
  toolTip: i18n.translate('xpack.ingestPipelines.pipelineEditor.item.moveButtonLabel', {
    defaultMessage: 'Copy to clipboard',
  }),
};

export const IfBadge: FunctionComponent<Props> = ({ onClick }) => {
  return (
    <EuiToolTip delay="long" content={i18nTexts.toolTip}>
      <EuiNotificationBadge
        className="pipelineProcessorsEditor__item__ifBadge"
        size="s"
        color="subdued"
        onClick={onClick}
      >
        {i18nTexts.badgeBody}
      </EuiNotificationBadge>
    </EuiToolTip>
  );
};
