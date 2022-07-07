/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode } from 'react';
import { EuiButtonIcon, EuiCopy, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DetailPanelListItem } from '../detail_panel_list_item';
import { useStyles } from './styles';

interface DetailPanelCopyDeps {
  children: ReactNode;
  textToCopy: string;
  tooltipContent: ReactNode;
  display?: 'inlineBlock' | 'block' | undefined;
}

interface DetailPanelListItemProps {
  copy: ReactNode;
  display?: string;
}

/**
 * Copy to clipboard component in Session view detail panel.
 */
export const DetailPanelCopy = ({
  children,
  textToCopy,
  tooltipContent,
  display = 'inlineBlock',
}: DetailPanelCopyDeps) => {
  const styles = useStyles();

  const props: DetailPanelListItemProps = {
    copy: (
      <EuiCopy textToCopy={textToCopy} display={display}>
        {(copy) => (
          <EuiButtonIcon
            css={styles.copyButton}
            onClick={copy}
            display="base"
            iconType="copyClipboard"
            size="xs"
            aria-label={i18n.translate('xpack.sessionView.detailPanelCopy.copyButton', {
              defaultMessage: 'Copy',
            })}
          />
        )}
      </EuiCopy>
    ),
  };

  if (display === 'block') {
    props.display = display;
  }

  return (
    <DetailPanelListItem {...props}>
      <EuiToolTip position="top" content={tooltipContent}>
        <>{children}</>
      </EuiToolTip>
    </DetailPanelListItem>
  );
};
