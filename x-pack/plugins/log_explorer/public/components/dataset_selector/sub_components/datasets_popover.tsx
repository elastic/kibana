/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiPopoverProps,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { PackageIcon } from '@kbn/fleet-plugin/public';
import { DatasetSelection } from '../../../../common/dataset_selection';
import { DATA_VIEW_POPOVER_CONTENT_WIDTH, POPOVER_ID } from '../constants';
import { getPopoverButtonStyles } from '../utils';

const panelStyle = { width: DATA_VIEW_POPOVER_CONTENT_WIDTH };
interface DatasetsPopoverProps extends Omit<EuiPopoverProps, 'button'> {
  children: React.ReactNode;
  onClick: () => void;
  selection: DatasetSelection['selection'];
}

export const DatasetsPopover = ({
  children,
  onClick,
  selection,
  ...props
}: DatasetsPopoverProps) => {
  const { iconType, parentIntegration } = selection.dataset;
  const title = selection.dataset.getFullTitle();
  const isMobile = useIsWithinBreakpoints(['xs', 's']);

  const buttonStyles = getPopoverButtonStyles({ fullWidth: isMobile });
  const hasIntegration = typeof parentIntegration === 'object';

  return (
    <EuiPopover
      id={POPOVER_ID}
      data-test-subj="datasetSelectorPopover"
      anchorPosition={isMobile ? 'downCenter' : 'downLeft'}
      button={
        <EuiButton
          css={buttonStyles}
          iconType="arrowDown"
          iconSide="right"
          onClick={onClick}
          fullWidth={isMobile}
          data-test-subj="datasetSelectorPopoverButton"
        >
          {iconType ? (
            <EuiIcon type={iconType} />
          ) : hasIntegration ? (
            <PackageIcon
              packageName={parentIntegration.name ?? ''}
              version={parentIntegration.version ?? '1.0.0'}
              icons={parentIntegration.icons}
              size="m"
              tryApi
            />
          ) : null}
          <span className="eui-textTruncate">{title}</span>
        </EuiButton>
      }
      panelPaddingSize="none"
      buffer={8}
      {...(isMobile && { display: 'block' })}
      {...props}
    >
      <EuiPanel
        paddingSize="none"
        hasShadow={false}
        css={panelStyle}
        data-test-subj="datasetSelectorContent"
      >
        {children}
      </EuiPanel>
    </EuiPopover>
  );
};
