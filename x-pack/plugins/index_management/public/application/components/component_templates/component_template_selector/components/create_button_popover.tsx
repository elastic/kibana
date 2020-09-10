/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { EuiPopover, EuiButton, EuiContextMenu } from '@elastic/eui';

interface Props {
  anchorPosition?: 'upCenter' | 'downCenter';
}

export const CreateButtonPopOver = ({ anchorPosition = 'upCenter' }: Props) => {
  const [isPopoverOpen, setIsPopOverOpen] = useState<boolean>(false);

  return (
    <EuiPopover
      id="createComponentTemplatePanel"
      button={
        <EuiButton
          fill
          data-test-subj="manageTemplateButton"
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsPopOverOpen((prev) => !prev)}
        >
          <FormattedMessage
            id="xpack.idxMgmt.componentTemplatesFlyout.manageButtonLabel"
            defaultMessage="Create"
          />
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopOverOpen(false)}
      panelPaddingSize="none"
      withTitle
      anchorPosition={anchorPosition}
      repositionOnScroll
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            title: i18n.translate(
              'xpack.idxMgmt.componentTemplatesFlyout.createContextMenuPanelTitle',
              {
                defaultMessage: 'New component template',
              }
            ),
            items: [
              {
                name: i18n.translate(
                  'xpack.idxMgmt.componentTemplatesFlyout.createComponentTemplateFromScratchButtonLabel',
                  {
                    defaultMessage: 'From scratch',
                  }
                ),
                icon: 'plusInCircle',
                onClick: () => {
                  // console.log('Create component template...');
                },
              },
              {
                name: i18n.translate(
                  'xpack.idxMgmt.componentTemplatesFlyout.createComponentTemplateFromExistingButtonLabel',
                  {
                    defaultMessage: 'From existing index template',
                  }
                ),
                icon: 'symlink',
                onClick: () => {
                  // console.log('Create component template from index template...');
                },
              },
            ],
          },
        ]}
      />
    </EuiPopover>
  );
};
