/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiTitle,
  EuiButtonEmpty,
  EuiContextMenu,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectOverviewState,
  setOverviewPageStateAction,
  updateManagementPageStateAction,
} from '../../../state';
import { useKibanaSpace } from '../../../../../hooks/use_kibana_space';

export const ShowAllSpaces: React.FC = () => {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxxs">
          <span>
            {i18n.translate('xpack.synthetics.showAllSpaces.spacesTextLabel', {
              defaultMessage: 'Spaces',
            })}
          </span>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <SelectablePopover />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const SelectablePopover = () => {
  const [isPopoverOpen, setPopover] = useState(false);
  const { space } = useKibanaSpace();

  const {
    pageState: { showFromAllSpaces },
  } = useSelector(selectOverviewState);
  const dispatch = useDispatch();

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };
  const closePopover = () => {
    setPopover(false);
  };

  const button = (
    <EuiButtonEmpty
      data-test-subj="syntheticsClickMeToLoadAContextMenuButton"
      iconType="arrowDown"
      iconSide="right"
      onClick={onButtonClick}
      size="xs"
    >
      {showFromAllSpaces ? ALL_SPACES_LABEL : space?.name || space?.id}
    </EuiButtonEmpty>
  );
  return (
    <EuiPopover
      id="contextMenuSpaces"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            title: 'Show monitors from',
            items: [
              {
                name: 'Current space',
                onClick: () => {
                  dispatch(
                    setOverviewPageStateAction({
                      showFromAllSpaces: false,
                    })
                  );
                  dispatch(
                    updateManagementPageStateAction({
                      showFromAllSpaces: false,
                    })
                  );
                },
              },
              {
                name: ALL_SPACES_LABEL,
                onClick: () => {
                  dispatch(
                    setOverviewPageStateAction({
                      showFromAllSpaces: true,
                    })
                  );
                  dispatch(
                    updateManagementPageStateAction({
                      showFromAllSpaces: true,
                    })
                  );
                },
              },
            ],
          },
        ]}
      />
    </EuiPopover>
  );
};

const ALL_SPACES_LABEL = i18n.translate('xpack.synthetics.showAllSpaces.allSpacesLabel', {
  defaultMessage: 'All permitted spaces',
});
