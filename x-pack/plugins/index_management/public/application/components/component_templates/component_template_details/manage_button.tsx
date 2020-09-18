/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiPopover,
  EuiButton,
  EuiContextMenu,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { ComponentTemplateDeserialized } from '../shared_imports';

export interface ManageAction {
  name: string;
  icon: string;
  handleActionClick: () => void;
  getIsDisabled?: (data: ComponentTemplateDeserialized) => boolean;
  closePopoverOnClick?: boolean;
}

interface Props {
  actions: ManageAction[];
  componentTemplateDetails: ComponentTemplateDeserialized;
}

export const ManageButton: React.FunctionComponent<Props> = ({
  actions,
  componentTemplateDetails,
}) => {
  const [isPopoverOpen, setIsPopOverOpen] = useState<boolean>(false);

  const items: EuiContextMenuPanelItemDescriptor[] = actions.map(
    ({ name, icon, getIsDisabled, closePopoverOnClick, handleActionClick }) => {
      const isDisabled = getIsDisabled ? getIsDisabled(componentTemplateDetails) : false;

      return {
        name,
        icon,
        disabled: isDisabled,
        toolTipContent: isDisabled ? (
          <FormattedMessage
            id="xpack.idxMgmt.componentTemplateDetails.manageButtonDisabledTooltipLabel"
            defaultMessage="Template is in use and cannot be deleted"
          />
        ) : null,
        onClick: () => {
          handleActionClick();

          if (closePopoverOnClick) {
            setIsPopOverOpen(false);
          }
        },
        'data-test-subj': 'action',
      };
    }
  );

  return (
    <EuiPopover
      id="manageComponentTemplatePanel"
      button={
        <EuiButton
          fill
          data-test-subj="manageComponentTemplateButton"
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsPopOverOpen((prevBoolean) => !prevBoolean)}
        >
          <FormattedMessage
            id="xpack.idxMgmt.componentTemplateDetails.manageButtonLabel"
            defaultMessage="Manage"
          />
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopOverOpen(false)}
      panelPaddingSize="none"
      withTitle
      anchorPosition="rightUp"
      repositionOnScroll
    >
      <EuiContextMenu
        initialPanelId={0}
        data-test-subj="manageComponentTemplateContextMenu"
        panels={[
          {
            id: 0,
            title: i18n.translate(
              'xpack.idxMgmt.componentTemplateDetails.manageContextMenuPanelTitle',
              {
                defaultMessage: 'Options',
              }
            ),
            items,
          },
        ]}
      />
    </EuiPopover>
  );
};
