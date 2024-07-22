/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiProgress,
  EuiTitle,
} from '@elastic/eui';
import {
  LazySavedObjectSaveModalDashboard,
  SaveModalDashboardProps,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SYNTHETICS_OVERVIEW_EMBEDDABLE } from '../../../../embeddables/constants';
import { ClientPluginsStart } from '../../../../../plugin';

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);

export const EmbeddablePanelWrapper: FC<{
  title: string;
  loading?: boolean;
}> = ({ children, title, loading }) => {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const [isDashboardAttachmentReady, setDashboardAttachmentReady] = React.useState(false);

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const { embeddable } = useKibana<ClientPluginsStart>().services;

  const isSyntheticsApp = window.location.pathname.includes('/app/synthetics');

  const handleAttachToDashboardSave: SaveModalDashboardProps['onSave'] = useCallback(
    ({ dashboardId, newTitle, newDescription }) => {
      const stateTransfer = embeddable.getStateTransfer();
      const embeddableInput = {};

      const state = {
        input: embeddableInput,
        type: SYNTHETICS_OVERVIEW_EMBEDDABLE,
      };

      const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

      stateTransfer.navigateToWithEmbeddablePackage('dashboards', {
        state,
        path,
      });
    },
    [embeddable]
  );

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder>
        {loading && <EuiProgress size="xs" color="accent" />}
        <EuiFlexGroup>
          <EuiFlexItem grow={true}>
            <EuiTitle size="xs">
              <h3>{title}</h3>
            </EuiTitle>
          </EuiFlexItem>
          {isSyntheticsApp && (
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={
                  <EuiButtonIcon
                    color="text"
                    data-test-subj="syntheticsEmbeddablePanelWrapperButton"
                    iconType="boxesHorizontal"
                    onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                  />
                }
                isOpen={isPopoverOpen}
                closePopover={closePopover}
              >
                <EuiContextMenuPanel
                  size="s"
                  items={[
                    <EuiContextMenuItem
                      key="share"
                      icon="dashboardApp"
                      onClick={() => {
                        setDashboardAttachmentReady(true);
                        closePopover();
                      }}
                    >
                      {i18n.translate(
                        'xpack.synthetics.embeddablePanelWrapper.shareContextMenuItemLabel',
                        { defaultMessage: 'Add to dashboard' }
                      )}
                    </EuiContextMenuItem>,
                  ]}
                />
              </EuiPopover>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {children}
      </EuiPanel>
      {isDashboardAttachmentReady ? (
        <SavedObjectSaveModalDashboard
          objectType={i18n.translate(
            'xpack.synthetics.item.actions.addToDashboard.objectTypeLabel',
            {
              defaultMessage: 'Status Overview',
            }
          )}
          documentInfo={{
            title: i18n.translate('xpack.synthetics.item.actions.addToDashboard.attachmentTitle', {
              defaultMessage: 'Status Overview',
            }),
          }}
          canSaveByReference={false}
          onClose={() => {
            setDashboardAttachmentReady(false);
          }}
          onSave={handleAttachToDashboardSave}
        />
      ) : null}
    </>
  );
};
