/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopoverTitle, EuiToolTip } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';
import type { FC } from 'react';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  reload: () => void;
}

export const EmbeddableMenu: FC<Props> = ({ reload }) => {
  const [showMenu, setShowMenu] = useState(false);
  const togglePopover = () => setShowMenu(!showMenu);

  const button = (
    <EuiToolTip
      content={i18n.translate('xpack.aiops.logCategorization.embeddableMenu.tooltip', {
        defaultMessage: 'Options',
      })}
    >
      <EuiButtonIcon
        data-test-subj="aiopsEmbeddableMenuOptionsButton"
        size="s"
        iconType="controlsHorizontal"
        onClick={() => togglePopover()}
        // @ts-expect-error - subdued does work
        color="subdued"
        aria-label={i18n.translate('xpack.aiops.logCategorization.embeddableMenu.aria', {
          defaultMessage: 'Log rate analysis options',
        })}
      />
    </EuiToolTip>
  );

  return (
    <EuiPopover
      id={'embeddableMenu'}
      button={button}
      isOpen={showMenu}
      closePopover={() => togglePopover()}
      panelPaddingSize="s"
      anchorPosition="downRight"
    >
      <EuiPanel color="transparent" paddingSize="s" css={{ maxWidth: '400px' }}>
        <EuiTitle size="xxxs">
          <EuiPopoverTitle>
            <FormattedMessage
              id="xpack.aiops.logCategorization.embeddableMenu.logRateAnalysisSettingsTitle"
              defaultMessage=" Log rate analysis settings"
            />
          </EuiPopoverTitle>
        </EuiTitle>
        <EuiSpacer size="s" />

        <LogRateAnalysisSettings />

        <EuiHorizontalRule margin="m" />
      </EuiPanel>
    </EuiPopover>
  );
};

interface LogRateAnalysisSettingsProps {
  compressed?: boolean;
}

export const LogRateAnalysisSettings: FC<LogRateAnalysisSettingsProps> = ({
  compressed = false,
}) => {
  return <>options dragons</>;
};
