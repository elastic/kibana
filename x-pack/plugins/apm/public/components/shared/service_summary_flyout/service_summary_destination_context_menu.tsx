/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { TypeOf } from '@kbn/typed-react-router-config';
import { ApmRoutes } from '../../routing/apm_route_config';
import { Node, NodeType } from '../../../../common/connections';
import { useApmRouter } from '../../../hooks/use_apm_router';

interface Props {
  params: TypeOf<ApmRoutes, '/services'>;
  destination: Node | { address: string };
  serviceName: string;
  jobId: string;
}

export function ServiceSummaryDestinationContextMenu({
  destination,
  params,
}: Props) {
  const router = useApmRouter();

  const overviewLink =
    'type' in destination && destination.type === NodeType.service
      ? {
          title: i18n.translate(
            'xpack.apm.serviceSummaryFlyout.contextMenu.goToService',
            { defaultMessage: 'View service' }
          ),
          href: router.link('/services/{serviceName}/overview', {
            path: {
              serviceName: destination.serviceName,
            },
            query: {
              ...params.query,
            },
          }),
        }
      : {
          title: i18n.translate(
            'xpack.apm.serviceSummaryFlyout.contextMenu.goToDependency',
            { defaultMessage: 'View dependency' }
          ),
          href: router.link('/dependencies/overview', {
            query: {
              ...params.query,
              dependencyName: destination.address,
            },
          }),
        };

  const items = [
    <EuiContextMenuItem size="s" href={overviewLink.href}>
      {overviewLink.title}
    </EuiContextMenuItem>,
  ];

  const [popoverMenuOpen, setPopoverMenuOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType="boxesVertical"
          onClick={() => setPopoverMenuOpen((isOpen) => !isOpen)}
        />
      }
      closePopover={() => setPopoverMenuOpen(false)}
      isOpen={popoverMenuOpen}
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
}
