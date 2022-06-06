/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { InnerLinkPanel } from './inner_link_panel';
import { LinkPanelListItem, LinkPanelViewProps } from './types';
import { DEV_TOOL_CONSOLE } from '../../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';

const protocol = window.location.protocol;
const hostname = window.location.hostname;
const port = window.location.port;

const loadFrom = `${protocol}//${hostname}:${port}${DEV_TOOL_CONSOLE}`;
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
}) => {
  const { spaces } = useKibana().services;
  const [spaceId, setSpaceId] = useState('{{space_name}}');
  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => setSpaceId(space.id));
    }
  }, [spaces]);
  return (
    <LinkPanelViewComponent
      listItems={listItems}
      splitPanel={
        <InnerLinkPanel
          body={bodyCopy}
          button={
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiButton
                  href={docLink}
                  color="warning"
                  target="_blank"
                  data-test-subj={`${dataTestSubjPrefix}-enable-module-button`}
                >
                  {buttonCopy}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton
                  href={`/app/dev_tools#/console?load_from=${loadFrom}?space_id=${spaceId}`}
                  color="warning"
                  target="_blank"
                  data-test-subj={`${dataTestSubjPrefix}-enable-module-button`}
                >
                  {'Open in Dev Tools'}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          color="warning"
          dataTestSubj={`${dataTestSubjPrefix}-inner-panel-danger`}
          title={titleCopy}
        />
      }
    />
  );
};

export const DisabledLinkPanel = memo(DisabledLinkPanelComponent);
DisabledLinkPanel.displayName = 'DisabledLinkPanel';
