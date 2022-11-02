/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiTitle, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React, { useMemo, useCallback } from 'react';
import type { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ApmPluginStartDeps } from '../../../../../plugin';
import { getLensAttributes } from './get_lens_attributes';
import {
  DEVICE_MODEL_NAME,
  HOST_OS_VERSION,
  NETWORK_CONNECTION_TYPE,
  SERVICE_VERSION,
} from '../../../../../../common/elasticsearch_fieldnames';

export type MostUsedMetricTypes =
  | typeof DEVICE_MODEL_NAME
  | typeof SERVICE_VERSION
  | typeof HOST_OS_VERSION
  | typeof NETWORK_CONNECTION_TYPE;

export function MostUsedChart({
  title,
  start,
  end,
  kuery,
  filters,
  metric,
}: {
  title: string;
  start: string;
  end: string;
  kuery?: string;
  filters: Filter[];
  metric: MostUsedMetricTypes;
}) {
  const { services } = useKibana<ApmPluginStartDeps>();
  const {
    lens: { EmbeddableComponent, navigateToPrefilledEditor, canUseEditor },
  } = services;

  const lensAttributes = useMemo(
    () =>
      getLensAttributes({
        kuery,
        filters,
        metric,
      }),
    [kuery, filters, metric]
  );

  const openInLens = useCallback(() => {
    if (lensAttributes) {
      navigateToPrefilledEditor(
        {
          id: `dataVisualizer-${metric}`,
          timeRange: {
            from: start,
            to: end,
          },
          attributes: lensAttributes,
        },
        {
          openInNewTab: true,
        }
      );
    }
  }, [navigateToPrefilledEditor, lensAttributes, start, end, metric]);

  const getOpenInLensAction = () => {
    return {
      id: 'openInLens',
      type: 'link',
      getDisplayName() {
        return i18n.translate('xpack.apm.serviceOverview.openInLens', {
          defaultMessage: 'Open in Lens',
        });
      },
      getIconType() {
        return 'visArea';
      },
      async isCompatible() {
        return true;
      },
      async execute() {
        openInLens();
        return;
      },
    };
  };

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate(`xpack.apm.serviceOverview.${metric}`, {
                defaultMessage: title,
                values: {
                  title,
                },
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexItem>
      <EuiFlexItem>
        <EmbeddableComponent
          viewMode={ViewMode.VIEW}
          id={`most-used-${metric.replaceAll('.', '-')}`}
          hidePanelTitles
          withDefaultActions
          style={{ height: 200 }}
          attributes={lensAttributes}
          timeRange={{
            from: start,
            to: end,
          }}
          {...(canUseEditor() && { extraActions: [getOpenInLensAction()] })}
        />
      </EuiFlexItem>
    </EuiPanel>
  );
}
