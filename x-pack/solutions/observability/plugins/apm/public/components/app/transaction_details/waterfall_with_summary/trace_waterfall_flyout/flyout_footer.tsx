/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR } from '@kbn/deeplinks-observability/locators';
import React, { useState } from 'react';
import {
  EBT_CLICK_ACTION_OPEN_IN_DISCOVER,
  EBT_CLICK_ACTION_OPEN_IN_APM,
} from '@kbn/ebt-click-actions';
import { useApmPluginContext } from '../../../../../context/apm_plugin/use_apm_plugin_context';
import { useDiscoverHref } from '../../../../shared/links/discover_links/use_discover_href';
import {
  EBT_ELEMENT_FLYOUT_WATERFALL_OPEN_IN_DISCOVER,
  EBT_ELEMENT_FLYOUT_WATERFALL_OPEN_IN_APM,
} from '../../../../shared/trace_waterfall/ebt_constants';

interface Props {
  traceId: string;
  rangeFrom: string;
  rangeTo: string;
}

export function TraceWaterfallFlyoutFooter({ traceId, rangeFrom, rangeTo }: Props) {
  const { share } = useApmPluginContext();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const discoverHref = useDiscoverHref({
    indexType: 'traces',
    rangeFrom,
    rangeTo,
    queryParams: { traceId },
  });

  const apmHref = share.url.locators
    .get<{ traceId: string; rangeFrom: string; rangeTo: string }>(
      TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR
    )
    ?.getRedirectUrl({ traceId, rangeFrom, rangeTo });

  if (!discoverHref && !apmHref) {
    return null;
  }

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiButton
                fill
                iconType="arrowDown"
                iconSide="right"
                size="s"
                data-test-subj="apmTraceWaterfallFlyoutActionsButton"
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              >
                {i18n.translate('xpack.apm.traceWaterfallFlyoutFooter.actionsButton', {
                  defaultMessage: 'Actions',
                })}
              </EuiButton>
            }
            isOpen={isPopoverOpen}
            closePopover={() => setIsPopoverOpen(false)}
            panelPaddingSize="none"
            anchorPosition="upRight"
            aria-label={i18n.translate(
              'xpack.apm.traceWaterfallFlyoutFooter.actionsPopoverAriaLabel',
              {
                defaultMessage: 'Actions for full trace',
              }
            )}
          >
            <EuiContextMenuPanel
              items={[
                ...(discoverHref
                  ? [
                      <EuiContextMenuItem
                        key="discover"
                        data-test-subj="apmTraceWaterfallOpenInDiscover"
                        data-ebt-action={EBT_CLICK_ACTION_OPEN_IN_DISCOVER}
                        data-ebt-element={EBT_ELEMENT_FLYOUT_WATERFALL_OPEN_IN_DISCOVER}
                        href={discoverHref}
                        onClick={() => setIsPopoverOpen(false)}
                      >
                        {i18n.translate('xpack.apm.traceWaterfallFlyoutFooter.openInDiscover', {
                          defaultMessage: 'Open in Discover',
                        })}
                      </EuiContextMenuItem>,
                    ]
                  : []),
                ...(apmHref
                  ? [
                      <EuiContextMenuItem
                        key="apm"
                        data-test-subj="apmTraceWaterfallOpenInApm"
                        data-ebt-action={EBT_CLICK_ACTION_OPEN_IN_APM}
                        data-ebt-element={EBT_ELEMENT_FLYOUT_WATERFALL_OPEN_IN_APM}
                        href={apmHref}
                        onClick={() => setIsPopoverOpen(false)}
                      >
                        {i18n.translate('xpack.apm.traceWaterfallFlyoutFooter.openInApm', {
                          defaultMessage: 'Open in APM',
                        })}
                      </EuiContextMenuItem>,
                    ]
                  : []),
              ]}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
}
