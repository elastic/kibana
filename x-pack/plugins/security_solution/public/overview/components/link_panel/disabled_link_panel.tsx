/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { windowCount } from 'rxjs';
import { InnerLinkPanel } from './inner_link_panel';
import { LinkPanelListItem, LinkPanelViewProps } from './types';

interface DisabledLinkPanelProps {
  bodyCopy: string;
  buttonCopy: string;
  dataTestSubjPrefix: string;
  docLink: string;
  LinkPanelViewComponent: React.ComponentType<LinkPanelViewProps>;
  listItems: LinkPanelListItem[];
  moreButtons: React.ReactElement;
  titleCopy: string;
}

const DisabledLinkPanelComponent: React.FC<DisabledLinkPanelProps> = ({
  bodyCopy,
  buttonCopy,
  dataTestSubjPrefix,
  docLink,
  learnMore,
  LinkPanelViewComponent,
  listItems,
  moreButtons,
  signalIndexExists,
  titleCopy,
}) => {
  const openDocLink = useCallback(
    (e) => {
      e.preventDefault();
      window.open(docLink, '_self');
    },
    [docLink]
  );
  return (
    <LinkPanelViewComponent
      listItems={listItems}
      signalIndexExists={signalIndexExists}
      splitPanel={
        <InnerLinkPanel
          body={bodyCopy}
          button={
            <EuiFlexGroup>
              {buttonCopy && (
                <EuiFlexItem>
                  <EuiButton
                    color="warning"
                    onClick={openDocLink}
                    href={docLink}
                    data-test-subj={`${dataTestSubjPrefix}-enable-module-button`}
                  >
                    {buttonCopy}
                  </EuiButton>
                </EuiFlexItem>
              )}
              {moreButtons && moreButtons}
            </EuiFlexGroup>
          }
          color="warning"
          dataTestSubj={`${dataTestSubjPrefix}-inner-panel-danger`}
          learnMore={learnMore}
          learnMoreLink={docLink}
          title={titleCopy}
        />
      }
    />
  );
};

export const DisabledLinkPanel = memo(DisabledLinkPanelComponent);
DisabledLinkPanel.displayName = 'DisabledLinkPanel';
