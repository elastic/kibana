/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
  EuiModalBody,
  EuiCallOut,
  EuiButton,
  EuiButtonEmpty,
  EuiBasicTable,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import type { EuiBasicTableProps } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export interface SettingsConfirmModalProps {
  changes: Array<{
    type: 'elasticsearch' | 'fleet_server';
    direction: 'removed' | 'added';
    urls: string[];
  }>;
  onConfirm: () => void;
  onClose: () => void;
}

type Change = SettingsConfirmModalProps['changes'][0];

const TABLE_COLUMNS: EuiBasicTableProps<Change>['columns'] = [
  {
    name: i18n.translate('xpack.fleet.settingsConfirmModal.fieldLabel', {
      defaultMessage: 'Field',
    }),
    field: 'label',
    render: (_, item) => getLabel(item),
    width: '180px',
  },
  {
    field: 'urls',
    name: i18n.translate('xpack.fleet.settingsConfirmModal.valueLabel', {
      defaultMessage: 'Value',
    }),
    render: (_, item) => {
      return (
        <EuiText size="s" color={item.direction === 'added' ? 'secondary' : 'danger'}>
          {item.urls.map((url) => (
            <div key={url}>{url}</div>
          ))}
        </EuiText>
      );
    },
  },
];

function getLabel(change: Change) {
  if (change.type === 'elasticsearch' && change.direction === 'removed') {
    return i18n.translate('xpack.fleet.settingsConfirmModal.elasticsearchRemovedLabel', {
      defaultMessage: 'Elasticsearch hosts (old)',
    });
  }

  if (change.type === 'elasticsearch' && change.direction === 'added') {
    return i18n.translate('xpack.fleet.settingsConfirmModal.elasticsearchAddedLabel', {
      defaultMessage: 'Elasticsearch hosts (new)',
    });
  }

  if (change.type === 'fleet_server' && change.direction === 'removed') {
    return i18n.translate('xpack.fleet.settingsConfirmModal.fleetServerRemovedLabel', {
      defaultMessage: 'Fleet Server hosts (old)',
    });
  }

  if (change.type === 'fleet_server' && change.direction === 'added') {
    return i18n.translate('xpack.fleet.settingsConfirmModal.fleetServerAddedLabel', {
      defaultMessage: 'Fleet Server hosts (new)',
    });
  }

  return i18n.translate('xpack.fleet.settingsConfirmModal.defaultChangeLabel', {
    defaultMessage: 'Unknown setting',
  });
}

export const SettingsConfirmModal = React.memo<SettingsConfirmModalProps>(
  ({ changes, onConfirm, onClose }) => {
    const hasESChanges = changes.some((change) => change.type === 'elasticsearch');
    const hasFleetServerChanges = changes.some((change) => change.type === 'fleet_server');

    return (
      <EuiModal maxWidth={true} onClose={onClose}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="xpack.fleet.settingsConfirmModal.title"
              defaultMessage="Apply settings to all agent policies"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.fleet.settingsConfirmModal.calloutTitle"
                defaultMessage="This action will update all agent policies and enrolled agents."
              />
            }
            color="warning"
            iconType="alert"
          >
            <EuiText size="s">
              {hasFleetServerChanges && (
                <p>
                  <FormattedMessage
                    id="xpack.fleet.settingsConfirmModal.fleetServerChangedText"
                    defaultMessage="If agents are unable to connect at the new {fleetServerUrl}, they will log an error and report an unhealthy status. They will remain on the current agent policy version and check for updates at the old URL until they successfully connect at the new URL"
                    values={{
                      fleetServerUrl: (
                        <strong>
                          <FormattedMessage
                            id="xpack.fleet.settingsConfirmModal.fleetServerUrl"
                            defaultMessage="Fleet Server URL"
                          />
                        </strong>
                      ),
                    }}
                  />
                </p>
              )}

              {hasESChanges && (
                <p>
                  <FormattedMessage
                    id="xpack.fleet.settingsConfirmModal.eserverChangedText"
                    defaultMessage="If agents are unable to connect at the new {elasticsearchUrl}, Fleet Server will report them as healthy but they will be unable to send data to Elasticsearch. This will not update URL that Fleet server itself uses to connect to Elasticsearch; you must manually reenroll it to update the URL"
                    values={{
                      elasticsearchUrl: (
                        <strong>
                          <FormattedMessage
                            id="xpack.fleet.settingsConfirmModal.elasticsearchUrl"
                            defaultMessage="Elasticsearch URL"
                          />
                        </strong>
                      ),
                    }}
                  />
                </p>
              )}
            </EuiText>
          </EuiCallOut>

          {changes.length > 0 && (
            <>
              <EuiSpacer size="m" />
              <EuiBasicTable tableLayout="auto" columns={TABLE_COLUMNS} items={changes} />
            </>
          )}
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onClose}>
            <FormattedMessage
              id="xpack.fleet.settingsConfirmModal.cancelButton"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
          <EuiButton onClick={onConfirm} fill>
            <FormattedMessage
              id="xpack.fleet.settingsConfirmModal.confirmButton"
              defaultMessage="Confirm changes"
            />
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);
