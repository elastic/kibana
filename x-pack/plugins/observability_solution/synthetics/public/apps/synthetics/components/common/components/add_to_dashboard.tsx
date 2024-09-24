/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import {
  LazySavedObjectSaveModalDashboard,
  SaveModalDashboardProps,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ClientPluginsStart } from '../../../../../plugin';
import {
  SYNTHETICS_MONITORS_EMBEDDABLE,
  SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE,
} from '../../../../embeddables/constants';

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);

export const AddToDashboard = ({
  type,
  asButton = false,
}: {
  type: typeof SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE | typeof SYNTHETICS_MONITORS_EMBEDDABLE;
  asButton?: boolean;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [isDashboardAttachmentReady, setDashboardAttachmentReady] = React.useState(false);
  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const { embeddable } = useKibana<ClientPluginsStart>().services;

  const handleAttachToDashboardSave: SaveModalDashboardProps['onSave'] = useCallback(
    ({ dashboardId, newTitle, newDescription }) => {
      const stateTransfer = embeddable.getStateTransfer();
      const embeddableInput = {};

      const state = {
        input: embeddableInput,
        type,
      };

      const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

      stateTransfer.navigateToWithEmbeddablePackage('dashboards', {
        state,
        path,
      });
    },
    [embeddable, type]
  );
  const isSyntheticsApp = window.location.pathname.includes('/app/synthetics');

  if (!isSyntheticsApp) {
    return null;
  }

  return (
    <>
      {asButton ? (
        <EuiButtonEmpty
          size="xs"
          color="primary"
          data-test-subj="syntheticsEmbeddablePanelWrapperButton"
          iconType="dashboardApp"
          onClick={() => setDashboardAttachmentReady(true)}
        >
          {i18n.translate('xpack.synthetics.embeddablePanelWrapper.shareButtonLabel', {
            defaultMessage: 'Add to dashboard',
          })}
        </EuiButtonEmpty>
      ) : (
        <EuiPopover
          button={
            <EuiButtonIcon
              color="text"
              data-test-subj="syntheticsEmbeddablePanelWrapperButton"
              iconType="boxesHorizontal"
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              aria-label={i18n.translate(
                'xpack.synthetics.embeddablePanelWrapper.shareButtonAriaLabel',
                {
                  defaultMessage: 'Add to dashboard',
                }
              )}
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
                  {
                    defaultMessage: 'Add to dashboard',
                  }
                )}
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      )}
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
