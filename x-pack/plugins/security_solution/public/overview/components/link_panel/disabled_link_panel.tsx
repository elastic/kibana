/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButton } from '@elastic/eui';

import { InnerLinkPanel } from './inner_link_panel';
import type { LinkPanelListItem, LinkPanelViewProps } from './types';

interface DisabledLinkPanelProps {
  bodyCopy: string;
  buttonCopy: string;
  dataTestSubjPrefix: string;
  docLink: string;
  LinkPanelViewComponent: React.ComponentType<LinkPanelViewProps>;
  listItems: LinkPanelListItem[];
  titleCopy: string;
}

const DisabledLinkPanelComponent: React.FC<DisabledLinkPanelProps> = ({
  bodyCopy,
  buttonCopy,
  dataTestSubjPrefix,
  docLink,
  LinkPanelViewComponent,
  listItems,
  titleCopy,
}) => (
  <LinkPanelViewComponent
    listItems={listItems}
    splitPanel={
      <InnerLinkPanel
        body={bodyCopy}
        button={
          <EuiButton
            href={docLink}
            color="warning"
            target="_blank"
            data-test-subj={`${dataTestSubjPrefix}-enable-module-button`}
          >
            {buttonCopy}
          </EuiButton>
        }
        color="warning"
        dataTestSubj={`${dataTestSubjPrefix}-inner-panel-danger`}
        title={titleCopy}
      />
    }
  />
);

export const DisabledLinkPanel = memo(DisabledLinkPanelComponent);
DisabledLinkPanel.displayName = 'DisabledLinkPanel';
