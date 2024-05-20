/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiListGroup,
  EuiListGroupItem,
  EuiButton,
  EuiSpacer,
  EuiText,
  EuiCallOut,
  EuiIcon,
} from '@elastic/eui';

import { SettingsWorkspaceProps } from './settings';
import { useListKeys } from './use_list_keys';
import { IconRenderer } from '../icon_renderer';

export function BlocklistForm({
  blocklistedNodes,
  unblockNode,
  unblockAll,
}: Pick<SettingsWorkspaceProps, 'blocklistedNodes' | 'unblockNode' | 'unblockAll'>) {
  const getListKey = useListKeys(blocklistedNodes || []);
  return (
    <>
      {blocklistedNodes && blocklistedNodes.length > 0 ? (
        <EuiText size="s">
          {i18n.translate('xpack.graph.settings.blocklist.blocklistHelpText', {
            defaultMessage: 'These terms are not allowed in the graph.',
          })}
        </EuiText>
      ) : (
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.graph.blocklist.noEntriesDescription"
              defaultMessage="You don't have any blocked terms. Select vertices and click {stopSign} in the control panel on the right to block them. Documents that match blocked terms are no longer explored and relationships to them are hidden."
              values={{
                stopSign: <EuiIcon type="eyeClosed" />,
              }}
            />
          }
        />
      )}
      <EuiSpacer />
      {blocklistedNodes && blocklistedNodes.length > 0 && (
        <>
          <EuiListGroup bordered maxWidth={false}>
            {blocklistedNodes.map((node) => (
              <EuiListGroupItem
                icon={
                  <IconRenderer icon={node.icon} className="gphLegacyIcon gphLegacyIcon--list" />
                }
                key={getListKey(node)}
                label={node.label}
                extraAction={{
                  iconType: 'trash',
                  'aria-label': i18n.translate('xpack.graph.blocklist.removeButtonAriaLabel', {
                    defaultMessage: 'Delete',
                  }),
                  title: i18n.translate('xpack.graph.blocklist.removeButtonAriaLabel', {
                    defaultMessage: 'Delete',
                  }),
                  color: 'danger',
                  onClick: () => unblockNode(node),
                }}
              />
            ))}
          </EuiListGroup>
          <EuiSpacer />
          <EuiButton
            data-test-subj="graphUnblocklistAll"
            color="danger"
            iconType="trash"
            size="s"
            fill
            onClick={() => unblockAll()}
          >
            {i18n.translate('xpack.graph.settings.blocklist.clearButtonLabel', {
              defaultMessage: 'Delete all',
            })}
          </EuiButton>
        </>
      )}
    </>
  );
}
