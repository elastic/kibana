/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiListGroup,
  EuiListGroupItem,
  EuiButton,
  EuiSpacer,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';

import { SettingsProps } from './settings';
import { LegacyIcon } from '../legacy_icon';
import { useListKeys } from './use_list_keys';

export function BlocklistForm({
  blocklistedNodes,
  unblocklistNode,
}: Pick<SettingsProps, 'blocklistedNodes' | 'unblocklistNode'>) {
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
              values={{ stopSign: <span className="kuiIcon fa-ban" /> }}
            />
          }
        />
      )}
      <EuiSpacer />
      {blocklistedNodes && unblocklistNode && blocklistedNodes.length > 0 && (
        <>
          <EuiListGroup bordered maxWidth={false}>
            {blocklistedNodes.map((node) => (
              <EuiListGroupItem
                icon={<LegacyIcon icon={node.icon} asListIcon />}
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
                  onClick: () => {
                    unblocklistNode(node);
                  },
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
            onClick={() => {
              blocklistedNodes.forEach((node) => {
                unblocklistNode(node);
              });
            }}
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
