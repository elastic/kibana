/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButton } from '@elastic/eui';

import { InnerLinkPanel } from './inner_link_panel';
import { LinkPanelListItem, LinkPanelViewProps } from './types';

interface DisabledLinkPanelProps {
  docLink: string;
  listItems: LinkPanelListItem[];
  titleCopy: string;
  bodyCopy: string;
  buttonCopy: string;
  dataTestSubjPrefix: string;
  LinkPanelViewComponent: React.ComponentType<LinkPanelViewProps>;
}

const DisabledLinkPanelComponent: React.FC<DisabledLinkPanelProps> = ({
  docLink,
  listItems,
  titleCopy,
  bodyCopy,
  buttonCopy,
  dataTestSubjPrefix,
  LinkPanelViewComponent,
}) => {
  return (
    <LinkPanelViewComponent
      splitPanel={
        <InnerLinkPanel
          color={'warning'}
          title={titleCopy}
          body={bodyCopy}
          button={
            <EuiButton
              href={docLink}
              color={'warning'}
              target="_blank"
              data-test-subj={`${dataTestSubjPrefix}-enable-module-button`}
            >
              {buttonCopy}
            </EuiButton>
          }
          dataTestSubj={`${dataTestSubjPrefix}-inner-panel-danger`}
        />
      }
      listItems={listItems}
    />
  );
};

export const DisabledLinkPanel = memo(DisabledLinkPanelComponent);
