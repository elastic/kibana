/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { InnerLinkPanel } from './inner_link_panel';
import type { LinkPanelListItem, LinkPanelViewProps } from './types';
import { LinkButton } from '../../../common/components/links';

interface DisabledLinkPanelProps {
  bodyCopy: string;
  buttonCopy?: string;
  dataTestSubjPrefix: string;
  docLink?: string;
  learnMoreUrl?: string;
  LinkPanelViewComponent: React.ComponentType<LinkPanelViewProps>;
  listItems: LinkPanelListItem[];
  moreButtons?: React.ReactElement;
  titleCopy: string;
}

const DisabledLinkPanelComponent: React.FC<DisabledLinkPanelProps> = ({
  bodyCopy,
  buttonCopy,
  dataTestSubjPrefix,
  docLink,
  learnMoreUrl,
  LinkPanelViewComponent,
  listItems,
  moreButtons,
  titleCopy,
}) => {
  return (
    <LinkPanelViewComponent
      listItems={listItems}
      splitPanel={
        <InnerLinkPanel
          body={bodyCopy}
          button={
            <EuiFlexGroup>
              {buttonCopy && docLink && (
                <EuiFlexItem>
                  <LinkButton
                    color="warning"
                    href={docLink}
                    target="_blank"
                    data-test-subj={`${dataTestSubjPrefix}-enable-module-button`}
                  >
                    {buttonCopy}
                  </LinkButton>
                </EuiFlexItem>
              )}
              {moreButtons && moreButtons}
            </EuiFlexGroup>
          }
          color="warning"
          dataTestSubj={`${dataTestSubjPrefix}-inner-panel-danger`}
          learnMoreLink={learnMoreUrl}
          title={titleCopy}
        />
      }
    />
  );
};

export const DisabledLinkPanel = memo(DisabledLinkPanelComponent);
DisabledLinkPanel.displayName = 'DisabledLinkPanel';
