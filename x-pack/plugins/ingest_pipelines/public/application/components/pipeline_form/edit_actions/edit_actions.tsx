/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiPopover,
  EuiIcon,
  EuiTextColor,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { useKibana } from '../../../../shared_imports';
import { getClonePath } from '../../../services/navigation';

interface Props {
  pipelineName: string;
}

export const EditActionsContextButton = ({ pipelineName }: Props) => {
  const {
    services: { history },
  } = useKibana();
  const [isPopoverOpen, setPopover] = useState<boolean>(false);

  const contextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'contextMenuPopover',
  });

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const goToClonePipeline = useCallback(
    (clonedPipelineName: string) => {
      const encodedParam = encodeURIComponent(clonedPipelineName);
      history.push(getClonePath({ clonedPipelineName: encodedParam }));
    },
    [history]
  );

  const panels = [
    {
      id: 0,
      items: [
        {
          name: 'Clone',
          icon: 'documents',
          onClick: () => goToClonePipeline(pipelineName),
        },
        {
          name: (
            // custom color
            <EuiTextColor color="danger">
              <span>Delete</span>
            </EuiTextColor>
          ),
          icon: <EuiIcon type="trash" size="m" color="danger" />,
          onClick: closePopover,
        },
      ],
    },
  ];

  const button = (
    <EuiButtonIcon
      size="m"
      display="fill"
      iconType="boxesVertical"
      aria-label="contextual actions"
      onClick={onButtonClick}
    />
  );

  return (
    <EuiPopover
      id={contextMenuPopoverId}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
    >
      <div style={{ maxWidth: '200px' }}>
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </div>
    </EuiPopover>
  );
};
