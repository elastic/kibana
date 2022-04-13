/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import React, { useMemo, useState } from 'react';
import { AlertFlyout } from '../../../../../alerting/inventory/components/alert_flyout';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../../../../lib/lib';
import { getNodeDetailUrl, getNodeLogsUrl } from '../../../../link_to';
import { findInventoryModel, findInventoryFields } from '../../../../../../common/inventory_models';
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';
import { InventoryItemType } from '../../../../../../common/inventory_models/types';
import { withTheme, EuiTheme } from '../../../../../../../../../src/plugins/kibana_react/common';
import {
  Section,
  SectionLinkProps,
  SectionTitle,
  SectionSubtitle,
  SectionLinks,
  SectionLink,
  ActionMenuDivider,
} from '../../../../../../../observability/public';
import { useLinkProps } from '../../../../../../../observability/public';
import { navigateToUptime } from '../../lib/navigate_to_uptime';
import { InfraClientCoreStart, InfraClientStartDeps } from '../../../../../types';

interface Props {
  options: InfraWaffleMapOptions;
  currentTime: number;
  node: InfraWaffleMapNode;
  nodeType: InventoryItemType;
}

export const NodeContextMenu: React.FC<Props & { theme?: EuiTheme }> = withTheme(
  ({ options, currentTime, node, nodeType }) => {
    const [flyoutVisible, setFlyoutVisible] = useState(false);
    const inventoryModel = findInventoryModel(nodeType);
    const nodeDetailFrom = currentTime - inventoryModel.metrics.defaultTimeRangeInSeconds * 1000;
    const { application, share } = useKibana<InfraClientCoreStart & InfraClientStartDeps>()
      .services;
    const uiCapabilities = application?.capabilities;
    // Due to the changing nature of the fields between APM and this UI,
    // We need to have some exceptions until 7.0 & ECS is finalized. Reference
    // #26620 for the details for these fields.
    // TODO: This is tech debt, remove it after 7.0 & ECS migration.
    const apmField = nodeType === 'host' ? 'host.hostname' : inventoryModel.fields.id;

    const showDetail = inventoryModel.crosslinkSupport.details;
    const showLogsLink =
      inventoryModel.crosslinkSupport.logs && node.id && uiCapabilities?.logs?.show;
    const showAPMTraceLink =
      inventoryModel.crosslinkSupport.apm && uiCapabilities?.apm && uiCapabilities?.apm.show;
    const showUptimeLink =
      inventoryModel.crosslinkSupport.uptime &&
      (['pod', 'container'].includes(nodeType) || node.ip);
    const showCreateAlertLink = uiCapabilities?.infrastructure?.save;

    const inventoryId = useMemo(() => {
      if (nodeType === 'host') {
        if (node.ip) {
          return { label: <EuiCode>host.ip</EuiCode>, value: node.ip };
        }
      } else {
        const { id } = findInventoryFields(nodeType);
        return {
          label: <EuiCode>{id}</EuiCode>,
          value: node.id,
        };
      }
      return { label: '', value: '' };
    }, [nodeType, node.ip, node.id]);

    const nodeLogsMenuItemLinkProps = useLinkProps(
      getNodeLogsUrl({
        nodeType,
        nodeId: node.id,
        time: currentTime,
      })
    );
    const nodeDetailMenuItemLinkProps = useLinkProps({
      ...getNodeDetailUrl({
        nodeType,
        nodeId: node.id,
        from: nodeDetailFrom,
        to: currentTime,
      }),
    });
    const apmTracesMenuItemLinkProps = useLinkProps({
      app: 'apm',
      hash: 'traces',
      search: {
        kuery: `${apmField}:"${node.id}"`,
      },
    });

    const nodeLogsMenuItem: SectionLinkProps = {
      label: i18n.translate('xpack.infra.nodeContextMenu.viewLogsName', {
        defaultMessage: '{inventoryName} logs',
        values: { inventoryName: inventoryModel.singularDisplayName },
      }),
      ...nodeLogsMenuItemLinkProps,
      'data-test-subj': 'viewLogsContextMenuItem',
      isDisabled: !showLogsLink,
    };

    const nodeDetailMenuItem: SectionLinkProps = {
      label: i18n.translate('xpack.infra.nodeContextMenu.viewMetricsName', {
        defaultMessage: '{inventoryName} metrics',
        values: { inventoryName: inventoryModel.singularDisplayName },
      }),
      ...nodeDetailMenuItemLinkProps,
      isDisabled: !showDetail,
    };

    const apmTracesMenuItem: SectionLinkProps = {
      label: i18n.translate('xpack.infra.nodeContextMenu.viewAPMTraces', {
        defaultMessage: '{inventoryName} APM traces',
        values: { inventoryName: inventoryModel.singularDisplayName },
      }),
      ...apmTracesMenuItemLinkProps,
      'data-test-subj': 'viewApmTracesContextMenuItem',
      isDisabled: !showAPMTraceLink,
    };

    const uptimeMenuItem: SectionLinkProps = {
      label: i18n.translate('xpack.infra.nodeContextMenu.viewUptimeLink', {
        defaultMessage: '{inventoryName} in Uptime',
        values: { inventoryName: inventoryModel.singularDisplayName },
      }),
      onClick: () => navigateToUptime(share.url.locators, nodeType, node),
      isDisabled: !showUptimeLink,
    };

    const createAlertMenuItem: SectionLinkProps = {
      label: i18n.translate('xpack.infra.nodeContextMenu.createRuleLink', {
        defaultMessage: 'Create inventory rule',
      }),
      onClick: () => {
        setFlyoutVisible(true);
      },
      isDisabled: !showCreateAlertLink,
    };

    return (
      <>
        <div style={{ maxWidth: 300 }} data-test-subj="nodeContextMenu">
          <Section>
            <SectionTitle>
              <FormattedMessage
                id="xpack.infra.nodeContextMenu.title"
                defaultMessage="{inventoryName} details"
                values={{ inventoryName: inventoryModel.singularDisplayName }}
              />
            </SectionTitle>
            {inventoryId.label && (
              <SectionSubtitle>
                <div style={{ wordBreak: 'break-all' }}>
                  <FormattedMessage
                    id="xpack.infra.nodeContextMenu.description"
                    defaultMessage="View details for {label} {value}"
                    values={{ label: inventoryId.label, value: inventoryId.value }}
                  />
                </div>
              </SectionSubtitle>
            )}
            <SectionLinks>
              <SectionLink data-test-subj="viewLogsContextMenuItem" {...nodeLogsMenuItem} />
              <SectionLink {...nodeDetailMenuItem} />
              <SectionLink data-test-subj="viewApmTracesContextMenuItem" {...apmTracesMenuItem} />
              <SectionLink {...uptimeMenuItem} color={'primary'} />
            </SectionLinks>
            <ActionMenuDivider />
            <SectionLinks>
              <SectionLink iconType={'bell'} color={'primary'} {...createAlertMenuItem} />
            </SectionLinks>
          </Section>
        </div>

        {flyoutVisible && (
          <AlertFlyout
            filter={`${findInventoryFields(nodeType).id}: "${node.id}"`}
            options={options}
            nodeType={nodeType}
            setVisible={setFlyoutVisible}
            visible={flyoutVisible}
          />
        )}
      </>
    );
  }
);
