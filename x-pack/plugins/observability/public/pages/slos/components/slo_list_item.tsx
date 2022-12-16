/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiLightVars } from '@kbn/ui-theme';

import { useKibana } from '../../../utils/kibana_react';
import { SloListItemSummaryStats } from './slo_list_item_summary_stats';
import { DeleteConfirmationModal } from './slo_list_item_delete_confirmation_modal';
import { paths } from '../../../config';
import { SLO } from '../../../typings';
import { isSloHealthy } from '../helpers/is_slo_healthy';

export interface SloListItemProps {
  slo: SLO;
  onDeleted: () => void;
  onDeleting: () => void;
}

export function SloListItem({ slo, onDeleted, onDeleting }: SloListItemProps) {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;

  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [isDeleteConfirmationModalOpen, setDeleteConfirmationModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClickActions = () => {
    setIsActionsPopoverOpen(!isActionsPopoverOpen);
  };

  const handleDelete = () => {
    setDeleteConfirmationModalOpen(true);
    setIsDeleting(true);
    setIsActionsPopoverOpen(false);
  };

  const handleNavigate = () => {
    navigateToUrl(basePath.prepend(paths.observability.sloDetails(slo.id)));
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationModalOpen(false);
    setIsDeleting(false);
  };

  const handleDeleteSuccess = () => {
    setDeleteConfirmationModalOpen(false);
    onDeleted();
  };

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      color={isDeleting ? 'subdued' : undefined}
      style={{ opacity: isDeleting ? 0.3 : 1, transition: 'opacity 0.15s ease-in' }}
    >
      <EuiFlexGroup responsive={false} alignItems="center">
        {/* CONTENT */}
        <EuiFlexItem grow>
          <EuiFlexGroup>
            <EuiFlexItem grow>
              <EuiFlexGroup direction="column" gutterSize="m">
                <EuiFlexItem>
                  <EuiLink onClick={handleNavigate}>{slo.name}</EuiLink>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <div>
                    {isSloHealthy(slo) ? (
                      <EuiBadge color={euiLightVars.euiColorSuccess}>
                        {i18n.translate('xpack.observability.slos.slo.state.healthy', {
                          defaultMessage: 'Healthy',
                        })}
                      </EuiBadge>
                    ) : (
                      <EuiBadge color={euiLightVars.euiColorDanger}>
                        {i18n.translate('xpack.observability.slos.slo.state.violated', {
                          defaultMessage: 'Violated',
                        })}
                      </EuiBadge>
                    )}
                  </div>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <SloListItemSummaryStats slo={slo} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* ACTIONS */}
        <EuiFlexItem grow={false}>
          <EuiPopover
            anchorPosition="downLeft"
            button={
              <EuiButtonIcon
                aria-label="Actions"
                display="empty"
                color="text"
                iconType="boxesVertical"
                size="s"
                onClick={handleClickActions}
              />
            }
            panelPaddingSize="none"
            closePopover={handleClickActions}
            isOpen={isActionsPopoverOpen}
          >
            <EuiContextMenuPanel
              size="s"
              items={[
                <EuiContextMenuItem key="edit" icon="trash" onClick={handleDelete}>
                  {i18n.translate('xpack.observability.slos.slo.item.actions.delete', {
                    defaultMessage: 'Delete',
                  })}
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isDeleteConfirmationModalOpen ? (
        <DeleteConfirmationModal
          slo={slo}
          onCancel={handleDeleteCancel}
          onDeleting={onDeleting}
          onDeleted={handleDeleteSuccess}
        />
      ) : null}
    </EuiPanel>
  );
}
