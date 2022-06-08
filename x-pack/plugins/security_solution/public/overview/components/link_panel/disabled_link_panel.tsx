/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import * as i18n from '../overview_risky_host_links/translations';
import { InnerLinkPanel } from './inner_link_panel';
import { LinkPanelListItem, LinkPanelViewProps } from './types';
import { devToolConsoleUrl } from '../../../../common/constants';
import { useKibana, useToasts } from '../../../common/lib/kibana';
import { useSpaceId } from '../../../risk_score/containers/common';
import { importFile } from './import_file';

const protocol = window.location.protocol;
const hostname = window.location.hostname;
const port = window.location.port;

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
  const spaceId = useSpaceId();
  const consoleId = '61c3927a-e933-4404-b986-188680950a95';
  const loadFrom = spaceId
    ? `${protocol}//${hostname}:${port}${devToolConsoleUrl(spaceId, consoleId)}`
    : null;
  const [statue, setStatus] = useState('idle');
  const [error, setError] = useState(undefined);

  const [response, setResponse] = useState(null);
  const {
    services: { http },
  } = useKibana();
  const toasts = useToasts();

  const importMyFile = async () => {
    setStatus('loading');

    try {
      const res = await importFile(http);
      setResponse(res);
      toasts.addSuccess(
        response.data.createDashboards.message.saved_objects
          .map((o, idx) => `${idx + 1}. ) ${o?.attributes?.title ?? o?.attributes?.name}`)
          .join(' ,')
      );
    } catch (e) {
      setError({
        status: 'error',
        error: e.message,
      });
    }
  };
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
              {loadFrom && (
                <EuiFlexItem>
                  <EuiButton
                    href={`/app/dev_tools#/console?load_from=${loadFrom}`}
                    color="warning"
                    target="_blank"
                    data-test-subj={`${dataTestSubjPrefix}-enable-module-button`}
                  >
                    {i18n.DANGER_BUTTON}
                  </EuiButton>
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <EuiButton
                  onClick={importMyFile}
                  color="warning"
                  target="_blank"
                  data-test-subj={`${dataTestSubjPrefix}-enable-module-button`}
                >
                  {'Import Dashboard'}
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
