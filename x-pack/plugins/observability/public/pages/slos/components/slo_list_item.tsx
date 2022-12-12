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

import { paths } from '../../../config';
import { SLO } from '../../../typings';
import { isSloHealthy } from '../helpers/is_slo_healthy';
import { SloListItemSummaryStats } from './slo_list_item_summary_stats';

export interface SloListItemProps {
  slo: SLO;
}

export function SloListItem({ slo }: SloListItemProps) {
  const { application, http } = useKibana().services;

  const navigateToUrl = application?.navigateToUrl;
  const basePath = http?.basePath;

  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const handleClickActions = () => {
    setPopoverOpen(!isPopoverOpen);
  };

  const handleEdit = () => {
    setPopoverOpen(false);
  };

  const handleDelete = () => {
    setPopoverOpen(false);
  };

  const handleClone = () => {
    setPopoverOpen(false);
  };

  const handleNavigate = () => {
    navigateToUrl(basePath.prepend(paths.observability.sloDetails(slo.id)));
  };

  return (
    <EuiPanel hasBorder hasShadow={false}>
      <EuiFlexGroup alignItems="center">
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
                        {i18n.translate('observability.slos.slo.state.healthy', {
                          defaultMessage: 'Healthy',
                        })}
                      </EuiBadge>
                    ) : (
                      <EuiBadge color={euiLightVars.euiColorDanger}>
                        {i18n.translate('observability.slos.slo.state.failed', {
                          defaultMessage: 'Failed',
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
                iconType="boxesVertical"
                size="s"
                onClick={handleClickActions}
              />
            }
            panelPaddingSize="none"
            closePopover={handleClickActions}
            isOpen={isPopoverOpen}
          >
            <EuiContextMenuPanel
              size="s"
              items={[
                <EuiContextMenuItem key="copy" icon="pencil" onClick={handleEdit}>
                  {i18n.translate('observability.slos.slo.item.actions.edit', {
                    defaultMessage: 'Edit',
                  })}
                </EuiContextMenuItem>,
                <EuiContextMenuItem key="edit" icon="trash" onClick={handleDelete}>
                  {i18n.translate('observability.slos.slo.item.actions.delete', {
                    defaultMessage: 'Delete',
                  })}
                </EuiContextMenuItem>,
                <EuiContextMenuItem key="share" icon="copy" onClick={handleClone}>
                  {i18n.translate('observability.slos.slo.item.actions.clone', {
                    defaultMessage: 'Clone',
                  })}
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
